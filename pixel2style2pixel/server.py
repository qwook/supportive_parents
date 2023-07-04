from argparse import Namespace
import os
import sys
import time
from flask import Flask, jsonify, request
from flask_cors import CORS
from io import BytesIO
import base64
import re
import json
from PIL import Image
import numpy as np
import scipy.ndimage
import torch
from tqdm import tqdm
from torch.utils.data import DataLoader
from configs import data_configs
from datasets.inference_dataset import InferenceDataset
from models.psp import pSp

from options.test_options import TestOptions
from utils.common import log_input_image, tensor2im

if __name__ == "__main__":
    sys.path.append("scripts")

    app = Flask(__name__)
    CORS(app, origins=["*"])

    def run():
        global opts, net, out_path_results
        test_opts = TestOptions().parse()

        # if test_opts.resize_factors is not None:
        #     assert len(
        #         test_opts.resize_factors.split(',')) == 1, "When running inference, provide a single downsampling factor!"
        #     out_path_results = os.path.join(test_opts.exp_dir, 'inference_results',
        #                                     'downsampling_{}'.format(test_opts.resize_factors))
        #     out_path_coupled = os.path.join(test_opts.exp_dir, 'inference_coupled',
        #                                     'downsampling_{}'.format(test_opts.resize_factors))
        # else:
        out_path_results = os.path.join("server_output")
        # out_path_coupled = os.path.join(test_opts.exp_dir, 'inference_coupled')

        os.makedirs("server_input", exist_ok=True)
        os.makedirs(out_path_results, exist_ok=True)
        # os.makedirs(out_path_coupled, exist_ok=True)

        # update test options with options used during training
        ckpt = torch.load("psp_ffhq_encode.pt", map_location="cpu")
        opts = ckpt["opts"]
        opts.update(vars(test_opts))
        opts["checkpoint_path"] = "psp_ffhq_encode.pt"
        if "learn_in_w" not in opts:
            opts["learn_in_w"] = False
        if "output_size" not in opts:
            opts["output_size"] = 1024
        opts = Namespace(**opts)

        net = pSp(opts)
        net.eval()
        net.cpu()

        # print('Loading dataset for {}'.format(opts.dataset_type))
        # dataset_args = data_configs.DATASETS[opts.dataset_type]
        # transforms_dict = dataset_args['transforms'](opts).get_transforms()
        # dataset = InferenceDataset(root=opts.data_path,
        #                            transform=transforms_dict['transform_inference'],
        #                            opts=opts)
        # dataloader = DataLoader(dataset,
        #                         batch_size=opts.test_batch_size,
        #                         shuffle=False,
        #                         num_workers=int(opts.test_workers),
        #                         drop_last=True)

        # if opts.n_images is None:
        #     opts.n_images = len(dataset)

        # global_i = 0
        # global_time = []
        # for input_batch in tqdm(dataloader):
        #     if global_i >= opts.n_images:
        #         break
        #     with torch.no_grad():
        #         input_cuda = input_batch.cpu().float()
        #         tic = time.time()
        #         result_batch = run_on_batch(input_cuda, net, opts)
        #         toc = time.time()
        #         global_time.append(toc - tic)

        #     for i in range(opts.test_batch_size):
        #         result = tensor2im(result_batch[i])
        #         im_path = dataset.paths[global_i]

        #         if opts.couple_outputs or global_i % 100 == 0:
        #             input_im = log_input_image(input_batch[i], opts)
        #             resize_amount = (256, 256) if opts.resize_outputs else (opts.output_size, opts.output_size)
        #             if opts.resize_factors is not None:
        #                 # for super resolution, save the original, down-sampled, and output
        #                 source = Image.open(im_path)
        #                 res = np.concatenate([np.array(source.resize(resize_amount)),
        #                                       np.array(input_im.resize(resize_amount, resample=Image.NEAREST)),
        #                                       np.array(result.resize(resize_amount))], axis=1)
        #             else:
        #                 # otherwise, save the original and output
        #                 res = np.concatenate([np.array(input_im.resize(resize_amount)),
        #                                       np.array(result.resize(resize_amount))], axis=1)
        #             Image.fromarray(res).save(os.path.join(out_path_coupled, os.path.basename(im_path)))

        #         im_save_path = os.path.join(out_path_results, os.path.basename(im_path))
        #         Image.fromarray(np.array(result)).save(im_save_path)

        #         global_i += 1

        # stats_path = os.path.join(opts.exp_dir, 'stats.txt')
        # result_str = 'Runtime {:.4f}+-{:.4f}'.format(np.mean(global_time), np.std(global_time))
        # print(result_str)

        # with open(stats_path, 'w') as f:
        #     f.write(result_str)

    run()

    def run_on_batch(inputs, net, opts, gender):
        direction_path = "directions/gender.npy"
        coeff = gender

        direction2_path = "directions/age.npy"
        coeff2 = 4

        if direction_path is not None:
            direction = np.load(direction_path)

        if direction2_path is not None:
            direction2 = np.load(direction2_path)

        if opts.latent_mask is None:
            result_batch = net(
                inputs,
                randomize_noise=False,
                resize=opts.resize_outputs,
                apply_direction=True,
                direction=(direction * coeff) + (direction2 * coeff2),
            )
        else:
            latent_mask = [int(l) for l in opts.latent_mask.split(",")]
            result_batch = []
            for image_idx, input_image in enumerate(inputs):
                # get latent vector to inject into our input image
                vec_to_inject = np.random.randn(1, 512).astype("float32")
                _, latent_to_inject = net(
                    torch.from_numpy(vec_to_inject).to("cpu"),
                    input_code=True,
                    return_latents=True,
                )

                for j in range(len(latent_to_inject)):
                    latent_to_inject[j][0:8] = (
                        latent_to_inject[j] + coeff * direction
                    )[0:8]

                # get output image with injected style vector
                res = net(
                    input_image.unsqueeze(0).to("cpu").float(),
                    latent_mask=latent_mask,
                    inject_latent=latent_to_inject,
                    alpha=opts.mix_alpha,
                    resize=opts.resize_outputs,
                )
                result_batch.append(res)
            result_batch = torch.cat(result_batch, dim=0)
        return result_batch

    def predict(output_path, gender):
        global opts, net
        print("Loading dataset for {}".format(opts.dataset_type))
        dataset_args = data_configs.DATASETS[opts.dataset_type]
        transforms_dict = dataset_args["transforms"](opts).get_transforms()
        dataset = InferenceDataset(
            root="server_input",
            transform=transforms_dict["transform_inference"],
            opts=opts,
        )
        dataloader = DataLoader(
            dataset, batch_size=1, shuffle=False, num_workers=1, drop_last=False
        )
        if opts.n_images is None:
            opts.n_images = len(dataset)

        global_i = 0
        global_time = []
        for input_batch in tqdm(dataloader):
            if global_i >= opts.n_images:
                break
            with torch.no_grad():
                input_cuda = input_batch.cpu().float()
                tic = time.time()
                result_batch = run_on_batch(input_cuda, net, opts, gender)
                toc = time.time()
                global_time.append(toc - tic)

            for i in range(1):
                result = tensor2im(result_batch[i])
                im_path = dataset.paths[global_i]

                im_save_path = os.path.join(out_path_results, output_path)
                print(im_save_path)
                print(im_path)
                Image.fromarray(np.array(result)).save(im_save_path)

                global_i += 1

    def image_align(
        img,
        dst_file,
        left_eyes,
        right_eyes,
        left_mouth,
        right_mouth,
        output_size=1024,
        transform_size=4096,
        enable_padding=False,
        x_scale=1,
        y_scale=1,
        em_scale=0.1,
        alpha=False,
    ):
        # Align function from FFHQ dataset pre-processing step
        # https://github.com/NVlabs/ffhq-dataset/blob/master/download_ffhq.py

        # Calculate auxiliary vectors.
        eye_left = np.mean(left_eyes, axis=0)
        eye_right = np.mean(right_eyes, axis=0)
        eye_avg = (eye_left + eye_right) * 0.5
        eye_to_eye = eye_right - eye_left
        mouth_avg = (left_mouth + right_mouth) * 0.5
        eye_to_mouth = mouth_avg - eye_avg

        # Choose oriented crop rectangle.
        x = eye_to_eye - np.flipud(eye_to_mouth) * [-1, 1]
        x /= np.hypot(*x)
        x *= max(np.hypot(*eye_to_eye) * 2.0, np.hypot(*eye_to_mouth) * 1.8)
        x *= x_scale
        y = np.flipud(x) * [-y_scale, y_scale]
        c = eye_avg + eye_to_mouth * em_scale
        quad = np.stack([c - x - y, c - x + y, c + x + y, c + x - y])
        qsize = np.hypot(*x) * 2

        # Shrink.
        shrink = int(np.floor(qsize / output_size * 0.5))
        if shrink > 1:
            rsize = (
                int(np.rint(float(img.size[0]) / shrink)),
                int(np.rint(float(img.size[1]) / shrink)),
            )
            img = img.resize(rsize, Image.ANTIALIAS)
            quad /= shrink
            qsize /= shrink

        # Crop.
        border = max(int(np.rint(qsize * 0.1)), 3)
        crop = (
            int(np.floor(min(quad[:, 0]))),
            int(np.floor(min(quad[:, 1]))),
            int(np.ceil(max(quad[:, 0]))),
            int(np.ceil(max(quad[:, 1]))),
        )
        crop = (
            max(crop[0] - border, 0),
            max(crop[1] - border, 0),
            min(crop[2] + border, img.size[0]),
            min(crop[3] + border, img.size[1]),
        )
        if crop[2] - crop[0] < img.size[0] or crop[3] - crop[1] < img.size[1]:
            img = img.crop(crop)
            quad -= crop[0:2]

        # Pad.
        pad = (
            int(np.floor(min(quad[:, 0]))),
            int(np.floor(min(quad[:, 1]))),
            int(np.ceil(max(quad[:, 0]))),
            int(np.ceil(max(quad[:, 1]))),
        )
        pad = (
            max(-pad[0] + border, 0),
            max(-pad[1] + border, 0),
            max(pad[2] - img.size[0] + border, 0),
            max(pad[3] - img.size[1] + border, 0),
        )
        if enable_padding and max(pad) > border - 4:
            pad = np.maximum(pad, int(np.rint(qsize * 0.3)))
            img = np.pad(
                np.float32(img), ((pad[1], pad[3]), (pad[0], pad[2]), (0, 0)), "reflect"
            )
            h, w, _ = img.shape
            y, x, _ = np.ogrid[:h, :w, :1]
            mask = np.maximum(
                1.0
                - np.minimum(np.float32(x) / pad[0], np.float32(w - 1 - x) / pad[2]),
                1.0
                - np.minimum(np.float32(y) / pad[1], np.float32(h - 1 - y) / pad[3]),
            )
            blur = qsize * 0.02
            img += (
                scipy.ndimage.gaussian_filter(img, [blur, blur, 0]) - img
            ) * np.clip(mask * 3.0 + 1.0, 0.0, 1.0)
            img += (np.median(img, axis=(0, 1)) - img) * np.clip(mask, 0.0, 1.0)
            img = np.uint8(np.clip(np.rint(img), 0, 255))
            if alpha:
                mask = 1 - np.clip(3.0 * mask, 0.0, 1.0)
                mask = np.uint8(np.clip(np.rint(mask * 255), 0, 255))
                img = np.concatenate((img, mask), axis=2)
                img = Image.fromarray(img, "RGBA")
            else:
                img = Image.fromarray(img, "RGB")
            quad += pad[:2]

        # Transform.
        img = img.transform(
            (transform_size, transform_size),
            Image.QUAD,
            (quad + 0.5).flatten(),
            Image.BILINEAR,
        )
        if output_size < transform_size:
            img = img.resize((output_size, output_size), Image.ANTIALIAS)

        # Save aligned image.
        img.save(dst_file, "PNG")

        return img

    @app.route("/upload", methods=["POST"])
    def index():
        image_data = re.sub("^data:image/.+;base64,", "", request.json["image"])
        img = Image.open(BytesIO(base64.b64decode(image_data)))
        image_align(
            img,
            "server_input/uploaded.png",
            left_eyes=np.array(request.json["leftEye"]),
            right_eyes=np.array(request.json["rightEye"]),
            left_mouth=np.array(request.json["rightMouth"]),
            right_mouth=np.array(request.json["leftMouth"]),
        )

        who = request.json["who"]
        
        if who == "dad":
            predict("dad.png", 3.1)
            dadFile = open("server_output/dad.png", "rb")
            encoded = "data:image/png;base64," + base64.b64encode(dadFile.read()).decode()
            dadFile.close()
        elif who == "mom":
            predict("mom.png", -3.1)
            momFile = open("server_output/mom.png", "rb")
            encoded = "data:image/png;base64," + base64.b64encode(momFile.read()).decode()
            momFile.close()

        print("success!")

        return jsonify({"image": encoded})

    app.run(port=3003)
