import variables from "less-plugin-dls/variables.json";

type VariableKeys = keyof typeof variables;
type MappingConfig = Record<string, string>;
type MappingConfigs<T extends string> = Record<T, MappingConfig>;
type ShortcutMappings = Record<string, VariableKeys>;

export const ignoredVariables: VariableKeys[] = [
  "dls-color-brand",
  "dls-color-info",
  "dls-color-success",
  "dls-color-warning",
  "dls-color-error",
  "dls-spacing-unit",
];

function range(start: number, end: number): string[] {
  const result = [];
  for (let i = 0; i <= Math.abs(end - start); i += end > start ? 1 : -1) {
    result.push((start + i).toString());
  }
  return result;
}

function createMappings(
  config: MappingConfig,
  indices: string[] | [number, number]
): ShortcutMappings {
  const mappings: ShortcutMappings = {};

  const realIndices =
    typeof indices[0] === "number" && typeof indices[1] === "number"
      ? range(indices[0], indices[1])
      : indices;

  for (let key in config) {
    for (let i of realIndices) {
      mappings[`${key}${i}`] = `${config[key]}-${i}` as VariableKeys;
    }
  }

  return mappings;
}

function createConfigs<T extends string>(configs: MappingConfigs<T>) {
  return configs;
}

const shortcutConfigs = createConfigs({
  color: {
    b: "dls-color-brand",
    i: "dls-color-info",
    s: "dls-color-success",
    w: "dls-color-warning",
    e: "dls-color-error",
    g: "dls-color-gray",
  },
  fontSize: {
    t: "dls-font-size",
  },
  fontWeight: {
    w: "dls-font-weight",
  },
  radius: {
    r: "dls-border-radius",
  },
  lineHeight: {
    lh: "dls-line-height",
  },
  shadow: {
    s: "dls-shadow",
    l: "dls-shadow-light"
  }
});

export const shortcuts: Record<keyof typeof shortcutConfigs, ShortcutMappings> = {
  color: createMappings(shortcutConfigs.color, [0, 11]),
  fontSize: createMappings(shortcutConfigs.fontSize, [0, 5]),
  fontWeight: createMappings(shortcutConfigs.fontWeight, [1, 3]),
  radius: createMappings(shortcutConfigs.radius, [0, 3]),
  lineHeight: createMappings(shortcutConfigs.lineHeight, [1, 3]),
  shadow: createMappings(shortcutConfigs.shadow, [1, 3]),
};
