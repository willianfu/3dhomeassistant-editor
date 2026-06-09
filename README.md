# 3DHomeAssistant Editor

基于 Web 技术的 3D 智能家居模型编辑器，用于加载全屋 GLB/GLTF 模型，查看模型零件层级，并在 3D 视图中选择、移动、删除和导出模型。

## 功能特性

- GLB/GLTF 模型上传与加载
- Three.js 3D 渲染视窗，支持透视视角旋转、缩放和点击选择
- 左侧原始模型层级树，使用虚拟滚动承载大型模型
- 右侧环境配置与模型信息面板
- 支持位置编辑、单选删除、导出 GLB
- 顶视、正视、侧视三视图模式
- 三视图下禁用旋转，支持拖拽框选完全框入的可见模型
- 支持批量选择与批量删除
- Draco 解码器内置，支持压缩 GLB

## 技术栈

- Vite
- React
- TypeScript
- Tailwind CSS
- shadcn/ui 风格本地组件
- Three.js
- Vitest

## 快速开始

```bash
npm install
npm run dev
```

打开：

```text
http://127.0.0.1:5173/
```

## 常用命令

```bash
npm run dev
npm test
npm run build
npm run preview
```

## 使用说明

1. 点击顶部“上传”，选择 `.glb` 或 `.gltf` 文件。
2. 左侧零件树会显示原始模型层级。
3. 点击树节点或 3D 模型可选中零件。
4. 在右侧“模型信息”中查看零件信息或调整位置。
5. 点击“顶视 / 正视 / 侧视”进入三视图模式。
6. 三视图模式下拖拽框选，只有完全被框住的模型会进入批量选择。
7. 按 `Delete` 或点击右侧删除按钮删除选中零件。
8. 点击顶部“导出”导出修改后的 GLB。

## 示例模型

项目包含一个全屋智能家居示例模型：

```text
public/sample/smart-home.glb
```

该文件约 92MB，用于本地演示“加载示例”功能。GitHub 对单文件有 100MB 硬限制，后续如果需要减小仓库体积，可以改为外部资源下载或使用 Git LFS。

## 项目结构

```text
src/
  components/editor/     编辑器 UI
  components/ui/         shadcn/ui 风格基础组件
  lib/                   Three.js 编辑器、模型树、虚拟滚动与工具逻辑
  types/                 共享类型
public/
  draco/                 Draco 解码器
  sample/                示例模型
```

## 验证状态

提交前请运行：

```bash
npm test
npm run build
```

