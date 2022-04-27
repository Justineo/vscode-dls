import {
  workspace,
  languages,
  ExtensionContext,
  CompletionItem,
  CompletionItemKind,
  Range,
  Position,
} from "vscode";
import variables from "less-plugin-dls/variables.json";
import { ignoredVariables, shortcuts } from "./config";
import { keys } from "./utils";

interface Variable {
  type:
    | "unknown"
    | "keyword"
    | "color"
    | "function"
    | "numeric"
    | "font"
    | "length"
    | "string"
    | "variable"
    | "complex";
  value: string;
  global: boolean;
}

type VariableMap = Record<string, Variable>;

type SupportedLangs = "less" | "vue";

enum Config {
  showComponentTokens = "DLS.showComponentTokens",
}

const TYPE_MAP = {
  unknown: CompletionItemKind.Value,
  keyword: CompletionItemKind.Keyword,
  color: CompletionItemKind.Color,
  function: CompletionItemKind.Function,
  numeric: CompletionItemKind.Value,
  font: CompletionItemKind.Text,
  length: CompletionItemKind.Unit,
  string: CompletionItemKind.Text,
  complex: CompletionItemKind.Value,
  variable: CompletionItemKind.Variable,
};

const normalizeMap: Record<string, string> = {
  transparent: "rgba(0, 0, 0, 0.01)",
};

const vars = variables as VariableMap;

function createShortcutItems(lang: SupportedLangs) {
  return keys(shortcuts)
    .map((key) => {
      const mappings = shortcuts[key];

      return keys(mappings).map((code) => ({
        code,
        name: mappings[code],
      }));
    })
    .flat()
    .map(({ code, name }) => {
      const variable = vars[name];
      const completion = new CompletionItem(
        code.toUpperCase(),
        TYPE_MAP[variable.type]
      );

      completion.documentation = normalizeMap[variable.value] || variable.value;
      completion.detail = `@${name}`;
      completion.filterText = lang === 'vue' ? code : `@${code}`;
      completion.sortText = name.replace(/(\d+)/g, (_, num) =>
        num.padStart(4, "0")
      );
      completion.insertText = lang === 'vue' ? name : `@${name}`;

      return completion;
    });
}
const SHORTCUT_ITEMS = {
  less: createShortcutItems('less'),
  vue: createShortcutItems('vue'),
};

const STYLE_OPEN_RE = /<style(?:>|([^>]*)>)/;
const STYLE_CLOSE_RE = /<\/style>/;
const ATTR_RE = /lang=(['"]?)less\1/i;

function registerProvider(context: ExtensionContext) {
  const showComponentTokens = workspace
    .getConfiguration()
    .get(Config.showComponentTokens);

  const provider = languages.registerCompletionItemProvider(
    ["less", "vue"],
    {
      provideCompletionItems(document, position) {
        let lang: SupportedLangs = "less";

        if (document.languageId === "vue") {
          const code = document.getText(
            new Range(new Position(0, 0), position)
          );
          
          if (code[code.length - 1] !== '@') {
            return [];
          }

          const matches = code.matchAll(new RegExp(STYLE_OPEN_RE, "g"));
          const lastMatch = [...matches].pop();

          if (!lastMatch || typeof lastMatch.index === "undefined") {
            // no <style> open tag found
            return [];
          }

          const [raw, rawAttrs] = lastMatch;
          const attrs = rawAttrs.split(/\s+/).filter(Boolean);

          if (!attrs.find((attr) => ATTR_RE.test(attr))) {
            // no lang=less attribute found
            return [];
          }

          const remaining = code.slice(lastMatch.index + raw.length);
          if (STYLE_CLOSE_RE.test(remaining)) {
            // <style lang=less> closed
            return [];
          }

          lang = "vue";
        }

        const keys = Object.keys(vars).filter(
          (key) => !ignoredVariables.includes(key as keyof typeof variables)
        );

        const resultKeys = showComponentTokens
          ? keys
          : keys.filter((key) => vars[key].global);

        return resultKeys
          .map((key) => {
            const variable = vars[key];
            const completion = new CompletionItem(
              `@${key}`,
              TYPE_MAP[variable.type]
            );

            completion.documentation =
              normalizeMap[variable.value] || variable.value;
            completion.detail = variable.value;
            completion.sortText =
              "_" + key.replace(/(\d+)/g, (_, num) => num.padStart(4, "0"));
            completion.insertText = lang === "vue" ? key : `@${key}`;
            return completion;
          })
          .concat(SHORTCUT_ITEMS[lang]);
      },
    },
    "@"
  );

  context.subscriptions.push(provider);
  return provider;
}

export function activate(context: ExtensionContext) {
  let provider = registerProvider(context);

  workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration(Config.showComponentTokens)) {
      provider.dispose();

      registerProvider(context);
    }
  });
}
