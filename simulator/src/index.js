// index.js — 折纸折叠模拟器核心库入口
export { FoldModel, validateFold, foldFromSegments, ASSIGNMENT } from './fold-model.js';
export { planarize, planarizeFold, snapKey } from './planarize.js';
export { buildFaces, totalFaceArea } from './halfedge.js';
export { buildFoldable, computeFolding, foldFromModel, totalArea, buildSteps, creaseAnglesForSteps, foldSteps } from './fold-engine.js';
export * from './geometry.js';
