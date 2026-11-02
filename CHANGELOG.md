# Changelog

## [0.3.0](https://github.com/Yofun/v2ex-enhancement/compare/v0.2.0...v0.3.0) (2026-11-02)

### Features

* async image rule scripts for plain links; fix first-click image preview size ([9d50353](https://github.com/Yofun/v2ex-enhancement/commit/9d50353a74c7b51ab927502634ea643fb6d68845))
* optional mecha theme for the post detail modal ([f434aa1](https://github.com/Yofun/v2ex-enhancement/commit/f434aa1db2b569b026f01327e940fe4d93248b0f))
* replace wheel zoom in image preview with zoom buttons ([b2cdc1b](https://github.com/Yofun/v2ex-enhancement/commit/b2cdc1b33e15bfa24b5714237b0c4e8c9d6180d7))
* restyle the V2EX home page itself and filter sidebar ads ([7b3cb83](https://github.com/Yofun/v2ex-enhancement/commit/7b3cb838e626a46a3f109bd6e41d09a7fe424fa5))
* top-right toasts with enter/leave animation and hover-to-pause ([2f952ac](https://github.com/Yofun/v2ex-enhancement/commit/2f952ac6622b6ed8c2f7d7952d46331c7c4fdbe2))
* user-defined image URL rewrite rules in settings ([4bcb997](https://github.com/Yofun/v2ex-enhancement/commit/4bcb997af5f18b327548bb360916b79caec86e01))

### Bug Fixes

* closing image preview no longer closes the post detail modal ([91566dd](https://github.com/Yofun/v2ex-enhancement/commit/91566dd231ca832b4a20eae21a4dfe626c2d549b))
* isolate image preview from host CSS and blur its backdrop ([8447540](https://github.com/Yofun/v2ex-enhancement/commit/8447540337f10a39815e10755d40c5c950317af4))
* keep a throwing GM_addStyle from killing the whole script ([f1d70f7](https://github.com/Yofun/v2ex-enhancement/commit/f1d70f7d35a7e9508eaeab705734c0c6755c587b))
* keyboard access, theming and overflow in list and comment UI ([7c4f0b1](https://github.com/Yofun/v2ex-enhancement/commit/7c4f0b120a886c7929641d7021235d8f50b1bb31))
* let the emoticon panel size itself to the active tab ([d18b6a1](https://github.com/Yofun/v2ex-enhancement/commit/d18b6a1dca94cedc9ce847c294808c3f5bdccfd0))
* make the comment toolbar actually appear on hover again ([48ae3e1](https://github.com/Yofun/v2ex-enhancement/commit/48ae3e1d02be0da9d88cda6357af575bee7aea0d))
* scroll post detail content instead of the whole overlay ([908c314](https://github.com/Yofun/v2ex-enhancement/commit/908c314d545194838f1a07810b56dc1ecf257943))
* stop an unscoped rule in image-rules from sizing every input on the page ([0dcd3a4](https://github.com/Yofun/v2ex-enhancement/commit/0dcd3a4b9e15d0fd376806a31b67752e3b5cb18d))
* stop simple view from replacing the logo and blurring the username ([5752d73](https://github.com/Yofun/v2ex-enhancement/commit/5752d732442416673a9738ae12ae72e80ed6020b)), references [#Logo](https://github.com/Yofun/v2ex-enhancement/issues/Logo) [#Logo](https://github.com/Yofun/v2ex-enhancement/issues/Logo)

### Refactor

* give simple view the same nested reply structure as normal view ([c74c9ad](https://github.com/Yofun/v2ex-enhancement/commit/c74c9ad896d2e4c038535f7115877a1ffbc16881))
* rebuild the emoticon picker as its own portal component ([df58673](https://github.com/Yofun/v2ex-enhancement/commit/df58673e7e54f15868ff536183c1d32af0eb5b9a))
* regroup the settings panel by what each option affects ([ea09c6b](https://github.com/Yofun/v2ex-enhancement/commit/ea09c6b3ddc7ca2f8d8469de1efd7b7d48b43176))

## 0.2.0 (2026-10-28)


### Features

* initialize V2EX enhancement userscript ([7ef358d](https://github.com/Yofun/v2ex-enhancement/commit/7ef358d926ee65e509cd3b971ea7c8b9024512f2))
* restore V2Next 10.31 as React + TS feature with e2e parity tests ([dc8533f](https://github.com/Yofun/v2ex-enhancement/commit/dc8533f23b977f935d50dfe6341b13585c7d4ddc))


### Bug Fixes

* make dev mode work (JSX runtime shim, drop dead forwardRef handles) ([52cfd84](https://github.com/Yofun/v2ex-enhancement/commit/52cfd84c23ae21abc34fc036c008e401029182dc))


### Refactor

* migrate styles to Sass ([8d1f79e](https://github.com/Yofun/v2ex-enhancement/commit/8d1f79efbd87ccee752f033fe9a888e7384ac47f))
* remove legacy features, keep only V2Next ([0af335d](https://github.com/Yofun/v2ex-enhancement/commit/0af335d8133cd236770cafa20ba923a932aea9d4))
* reorganize src into layered structure ([a4e73f0](https://github.com/Yofun/v2ex-enhancement/commit/a4e73f017d2e039cbbcac0d7827e0207c164bb64))
