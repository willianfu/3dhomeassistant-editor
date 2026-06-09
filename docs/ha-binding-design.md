# Home Assistant 模型绑定设计

## 对象标识

Three.js 的 `uuid` 是运行时 ID，每次加载都可能变化。编辑器使用 `object.userData.homeAssistant.objectId` 作为可持久化业务 ID，并在导出 GLB 时写入 glTF `extras`。

生成规则：
- 优先保留已有 `homeAssistant.objectId`。
- 没有 ID 时，按模型层级路径生成，例如 `全屋智能家居模型/lamp_01`。
- 同级重名对象自动追加 `_2`、`_3`，避免复制模型被合并。

## 绑定粒度

一个智能设备可能对应一个 Mesh，也可能是一批子模型集合。建议使用两层标识：

- `objectId`：单个模型节点的稳定 ID。
- `bindingGroupId`：设备绑定组 ID，多个子模型可以共享同一个绑定组。

右侧配置后续可增加“绑定”面板：
- HA 实体 ID，例如 `light.living_room_main`。
- 绑定组 ID，例如 `device.living_room_ceiling_light`。
- 设备类型，例如 `light`、`switch`、`sensor`。
- 视觉效果配置，例如发光颜色、强度、是否创建点光源。

## 灯光效果

当 HA 灯实体开启时：
- 找到相同 `entityId` 或 `bindingGroupId` 的对象集合。
- 克隆并缓存材质，提升 `emissive`、`emissiveIntensity`。
- 在对象集合包围盒中心创建 `PointLight` 或 `SpotLight`。
- 根据 HA 亮度、色温、RGB 状态同步颜色和强度。

当 HA 灯实体关闭时：
- 恢复原材质发光参数。
- 移除或关闭对应动态光源。

## 运行态同步

后续可通过 Home Assistant WebSocket API 订阅状态：
- 初次连接后拉取 entity states。
- 订阅 `state_changed` 事件。
- 根据 `entity_id` 更新绑定模型效果。

编辑器负责保存绑定数据到 GLB；运行态主控面板负责连接 HA 并应用状态。
