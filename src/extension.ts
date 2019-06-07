/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as vscode from 'vscode'
import variables from 'less-plugin-dls/variables.json'

interface Variable {
  type:
    | 'unknown'
    | 'keyword'
    | 'color'
    | 'function'
    | 'numeric'
    | 'length'
    | 'string'
    | 'complex'
  value: string
  equals?: string[]
}

interface VariableMap {
  [propName: string]: Variable
}

const Kind = vscode.CompletionItemKind
const TypeMap = {
  unknown: Kind.Variable,
  keyword: Kind.Keyword,
  color: Kind.Color,
  function: Kind.Function,
  numeric: Kind.Value,
  length: Kind.Unit,
  string: Kind.Text,
  complex: Kind.Variable
}

const vars = <VariableMap>variables

export function activate(context: vscode.ExtensionContext) {
  const dlsProvider = vscode.languages.registerCompletionItemProvider(
    'less',
    {
      provideCompletionItems() {
        return Object.keys(variables).map(key => {
          const variable = vars[key]
          const completion = new vscode.CompletionItem(
            `@${key}`,
            TypeMap[variable.type]
          )
          const list = (variable.equals || []).map(key => `@${key}`).join('\n')
          completion.documentation = new vscode.MarkdownString(
            [
              '**Default value:**',
              '',
              '```text',
              variable.value,
              '```',
              ...(list ? ['', '**Same as:**', '', '```text', list, '```'] : [])
            ].join('\n')
          )
          return completion
        })
      }
    },
    '@'
  )

  context.subscriptions.push(dlsProvider)
}
