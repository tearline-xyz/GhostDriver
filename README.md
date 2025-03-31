# Tearline Auto Browser CRX

为了便于用户使用Browser-use，我们需要开发一个浏览器扩展和后端服务，实现让用户通过自然语言描述任务，经由AI分析后控制浏览器自动执行，该项目是前端部分。

## Simplified version release strategy

- `alpha`
    - 内部测试版本，预期有较多问题。
    - 只有`alpha`版本才会在扩展的Option页面包含`Developer settings`。
- `beta`
    - 邀请制外部测试。
- `release`
    - 经过验证的稳定版本。

示例：
```
1.0.0-alpha.1    (第一个内部测试版)
1.0.0-alpha.2    (内部测试版迭代)
...
1.0.0-alpha.n    (最后一个内部测试版)

1.0.0-beta.1     (第一个外部测试版)
1.0.0-beta.2     (外部测试版迭代)
...
1.0.0-beta.n     (最后一个外部测试版)

1.0.0-rc.1       (可选:第一个发布候选版)
1.0.0-rc.2       (可选:发布候选版迭代)
...

1.0.0            (正式发布版)
```

## Development

### playwright-crx

该扩展项目依赖[ruifigueira/playwright-crx](https://github.com/ruifigueira/playwright-crx)，我们对它进行了修改，以支持能够通过WebSocket与后端进行通信，修改后的代码目前闭源，请见[tearline-xyz/playwright-crx](https://github.com/tearline-xyz/playwright-crx)。
在开发过程中，无论是初始化项目还是对playwricght-crx继续修改，都需要在本项目根目录下执行：

```bash
./auto/build-playwright-crx.sh
```

## [Publish](https://wxt.dev/guide/essentials/publishing.html)

1. 修改package.json中的version字段的值。
2. 执行`pnpm zip`
