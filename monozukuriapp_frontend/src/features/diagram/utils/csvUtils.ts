import Papa from "papaparse";
import { Bone, DiagramState } from "../types";

export const exportToCSV = (data: DiagramState): string => {
  const csvData = [
    ["Characteristic", data.characteristic],
    ["Type", "Text"],
    ...data.largeBones.map((bone) => ["Large Bone", bone.text]),
    ...data.mediumBones.flatMap((bones, index) =>
      bones.map((bone) => [`Medium Bone (Parent: ${data.largeBones[index].text})`, bone.text]),
    ),
    ...data.smallBones.flatMap((mediumBones, largeIndex) =>
      mediumBones.flatMap((bones, mediumIndex) =>
        bones.map((bone) => [
          `Small Bone (Parent: ${data.largeBones[largeIndex].text} > ${data.mediumBones[largeIndex][mediumIndex].text})`,
          bone.text,
        ]),
      ),
    ),
  ];

  return Papa.unparse(csvData);
};

export const importFromCSV = (csvString: string): Partial<DiagramState> => {
  const parseResult = Papa.parse(csvString, { header: false });

  if (!Array.isArray(parseResult.data)) {
    throw new Error("Invalid CSV format");
  }

  const result: Partial<DiagramState> = {
    characteristic: "",
    largeBones: [],
    mediumBones: [],
    smallBones: [],
  };

  parseResult.data.forEach((row: unknown) => {
    if (Array.isArray(row) && row.length >= 2) {
      const [type, value] = row as [string, string];

      if (type === "Characteristic") {
        result.characteristic = value;
      } else if (type === "Large Bone") {
        result.largeBones!.push({ id: Date.now().toString(), text: value });
      } else if (type.startsWith("Medium Bone")) {
        const parentText = type.match(/\(Parent: (.+)\)/)?.[1];
        const parentIndex = result.largeBones!.findIndex((bone) => bone.text === parentText);
        if (parentIndex !== -1) {
          if (!result.mediumBones![parentIndex]) {
            result.mediumBones![parentIndex] = [];
          }
          result.mediumBones![parentIndex].push({ id: Date.now().toString(), text: value });
        }
      } else if (type.startsWith("Small Bone")) {
        const [largeParentText, mediumParentText] = type.match(/\(Parent: (.+) > (.+)\)/)?.[1].split(" > ") ?? [];
        const largeParentIndex = result.largeBones!.findIndex((bone) => bone.text === largeParentText);
        if (largeParentIndex !== -1) {
          const mediumParentIndex = result.mediumBones![largeParentIndex]?.findIndex(
            (bone) => bone.text === mediumParentText,
          );
          if (mediumParentIndex !== -1) {
            if (!result.smallBones![largeParentIndex]) {
              result.smallBones![largeParentIndex] = [];
            }
            if (!result.smallBones![largeParentIndex][mediumParentIndex]) {
              result.smallBones![largeParentIndex][mediumParentIndex] = [];
            }
            result.smallBones![largeParentIndex][mediumParentIndex].push({ id: Date.now().toString(), text: value });
          }
        }
      }
    }
  });

  return result;
};
