import {
  workspace,
  languages,
  ExtensionContext,
  CompletionItem,
  CompletionItemKind,
  window,
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
    | "length"
    | "string"
    | "complex";
  value: string;
  global: boolean;
}

type VariableMap = Record<string, Variable>;

enum CONFIG {
  SHOW_COMPONENT_TOKENS = "DLS.showComponentTokens",
}

const TypeMap = {
  unknown: CompletionItemKind.Variable,
  keyword: CompletionItemKind.Keyword,
  color: CompletionItemKind.Color,
  function: CompletionItemKind.Function,
  numeric: CompletionItemKind.Value,
  length: CompletionItemKind.Unit,
  string: CompletionItemKind.Text,
  complex: CompletionItemKind.Variable,
};

const normalizeMap: Record<string, string> = {
  transparent: "rgba(0, 0, 0, 0.01)",
};

const vars = variables as VariableMap;

const shortcutItems = keys(shortcuts)
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
      TypeMap[variable.type]
    );

    completion.documentation = normalizeMap[variable.value] || variable.value;
    completion.detail = `@${name}`;
    completion.filterText = `@${code}`;
    completion.sortText = name.replace(/(\d+)/g, (_, num) =>
      num.padStart(4, "0")
    );
    completion.insertText = `@${name}`;

    return completion;
  });

let orange = window.createOutputChannel("Orange");
orange.appendLine(shortcutItems.map((i) => i.label).join());

function registerProvider(context: ExtensionContext) {
  const showComponentTokens = workspace
    .getConfiguration()
    .get(CONFIG.SHOW_COMPONENT_TOKENS);

  const provider = languages.registerCompletionItemProvider(
    "less",
    {
      provideCompletionItems() {
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
              TypeMap[variable.type]
            );

            completion.documentation =
              normalizeMap[variable.value] || variable.value;
            completion.detail = variable.value;
            completion.sortText =
              "_" + key.replace(/(\d+)/g, (_, num) => num.padStart(4, "0"));
            return completion;
          })
          .concat(shortcutItems);
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
    if (e.affectsConfiguration(CONFIG.SHOW_COMPONENT_TOKENS)) {
      provider.dispose();

      registerProvider(context);
    }
  });
}
