import { Font } from "@react-pdf/renderer";
import path from "path";

const fontDir = path.resolve(process.cwd(), "public/fonts");

let registered = false;
export function registerMusicListFonts(): void {
  if (registered) return;
  registered = true;

  Font.register({
    family: "CormorantGaramond",
    fonts: [
      { src: path.join(fontDir, "CormorantGaramond-Light.ttf"), fontWeight: 300 },
      { src: path.join(fontDir, "CormorantGaramond-Regular.ttf"), fontWeight: 400 },
      { src: path.join(fontDir, "CormorantGaramond-Medium.ttf"), fontWeight: 500 },
      { src: path.join(fontDir, "CormorantGaramond-SemiBold.ttf"), fontWeight: 600 },
      { src: path.join(fontDir, "CormorantGaramond-Italic.ttf"), fontWeight: 400, fontStyle: "italic" },
    ],
  });
  Font.register({
    family: "SourceSerif4",
    fonts: [
      { src: path.join(fontDir, "SourceSerif4-Regular.ttf"), fontWeight: 400 },
      { src: path.join(fontDir, "SourceSerif4-Italic.ttf"), fontWeight: 400, fontStyle: "italic" },
    ],
  });

  Font.registerHyphenationCallback((word) => [word]);
}
