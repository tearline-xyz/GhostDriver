// 定义菜单项接口
export interface SuggestionMenuItem {
  id: string
  label: string
  children?: SuggestionMenuItem[]
  needUserInput?: boolean
}

// 定义菜单项数据
export const suggestionMenuItems: SuggestionMenuItem[] = [
  {
    id: "tearline",
    label: "@Tearline",
  },
  {
    id: "web",
    label: "@Web",
    children: [
      {
        id: "web-google-search",
        label: "Google search",
        needUserInput: true,
      },
      {
        id: "go-to-url",
        label: "Go to url",
        needUserInput: true,
      },
    ],
  },
  {
    id: "action",
    label: "@Action",
    children: [
      {
        id: "action-ask-me",
        label: "Ask me",
      },
    ],
  },
]
