import _ from "lodash";

export default function lottieReplace(
  lottie: any,
  content: {
    title?: string;
    subtitle?: string;
    name?: string;
    content?: string;
    list?: string[];
  }
) {
  return _.cloneDeepWith(_.cloneDeep(lottie), (value) => {
    if (typeof value === "string") {
      if (value === "{title}") {
        return content.title || "";
      } else if (value === "{content}") {
        return content.content || "";
      } else if (value === "{name}") {
        return content.name || "";
      } else if (value === "{This is long text content}") {
        return content.content || "";
      } else if (value === "{subtitle}") {
        return content.subtitle || "";
      }
      if (content.list) {
        for (let i = 1; i <= 10; i++) {
          if (value === `{content-item-${i}}`) {
            return content.list[i - 1] || "";
          }
        }
      }
      return value;
    }
  });
}
