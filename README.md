# 小游戏合集

线上地址：<https://zhanjhe.github.io/joke-love-tarot/>

7 个网页小游戏，全部纯静态，点开就能玩。没有后端、没有框架、没有构建步骤。

| 游戏 | 说明 |
| --- | --- |
| [俄罗斯方块](tetris/index.html) | 10×20 格子，消行得分，越往后越快 |
| [恋爱转盘](wheel/index.html) | 想不明白的事，交给转盘决定 |
| [恋爱塔罗](tarot/index.html) | 24 道题，抽一张属于你的牌，能分享结果 |
| [2048](2048/index.html) | 合并相同数字，凑到 2048 |
| [记忆翻牌](memory/index.html) | 翻两张，把图案配成一对 |
| [贪吃蛇](snake/index.html) | 越吃越长，别撞墙别咬到自己 |
| [扫雷](minesweeper/index.html) | 9×9 藏 10 颗雷，第一次点必定安全 |

## 本地打开

直接双击 `index.html`。所有资源都是相对路径，不需要起服务器，也没有构建步骤。

## 目录

```
index.html        首页，8 个卡片（7 个游戏 + 1 个「更多在路上」占位）
about/            关于（暂时停用）
tetris/ wheel/ tarot/ 2048/ memory/ snake/ minesweeper/
assets/           站点公共样式、图标、分享缩略图
tarot/assets/     塔罗页自己的样式和脚本
tools/            自检脚本（需要 Node.js）
开发文档/          设计说明、游戏说明、截图
```

每个游戏是一个独立的 `index.html`，样式和脚本都内联，互相不依赖。

## 自检

```powershell
node tools/check-pages.js   # 9 个页面：结构断言 + 交互冒烟 + 截图
node tools/check-data.js    # 塔罗题库均衡性（每张牌必须被选 9 次）
node tools/live-check.js    # 同上，跑线上地址
```

`check-pages.js` 用本机 Chrome 的无头模式跑，走完 9 个页面并截图到 `开发文档/预览/站点/`，有报错会非零退出。脚本里 Chrome 路径是写死的，换机器要改。

## 部署

仓库 `ZhanJHE/joke-love-tarot`，Pages 走 `main` 分支根目录，`git push` 后自动重建。

```powershell
git add -A
git commit -m "改了什么"
git push
```

## 改内容

- 首页卡片顺序：改 `index.html` 里 `<a class="card">` 的顺序
- 某个游戏的参数（速度、雷数、转盘选项、牌面图案）：见 [开发文档/小游戏说明.md](开发文档/小游戏说明.md)
- 塔罗的题目和文案：`tarot/assets/js/data.js`，改完跑 `node tools/check-data.js`
- 主屏幕图标：`node tools/icon.js` 重新生成 `assets/icon-180.png`

站点结构、样式约定、验证流程见 [开发文档/站点说明.md](开发文档/站点说明.md)。

## 说明

纯静态，无后端、无第三方接口、无埋点。分数只存在自己浏览器里。仅供娱乐。
