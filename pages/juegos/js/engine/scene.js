// Gestor minimo de escenas. Cada escena expone update() y render().
// Fase 1: solo existe la escena game con el comportamiento actual.
var scenes = {};
var current = null;
export function registerScene(name, sc) {
  scenes[name] = sc;
}
export function setScene(name) {
  if (scenes[name]) current = scenes[name];
}
export function currentScene() {
  return current;
}
export function updateScene() {
  if (current && current.update) current.update();
}
export function renderScene() {
  if (current && current.render) current.render();
}
