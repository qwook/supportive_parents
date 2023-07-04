python scripts/inference.py \
--exp_dir=experiments/ \
--checkpoint_path=psp_ffhq_encode.pt \
--data_path=aligned_images/ \
--test_batch_size=1 \
--test_workers=1 \
--couple_outputs
