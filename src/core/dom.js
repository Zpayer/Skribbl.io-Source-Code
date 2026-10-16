
export function bind(target, events, handler) {
  const elements =
    typeof target === "string"
      ? document.querySelectorAll(target)
      : isArrayLike(target)
        ? target
        : [target];

  const list = events.split(" ");

  for (let i = 0; i < elements.length; i++) {
    for (let j = 0; j < list.length; j++) {
      elements[i].addEventListener(list[j], handler);
    }
  }
}

function isArrayLike(value) {
  const type = Object.prototype.toString.call(value);
  return (
    type === "[object Array]" ||
    type === "[object NodeList]" ||
    type === "[object HTMLCollection]"
  );
}


export function el(classes, text) {
  const node = document.createElement("div");

  if (classes !== undefined) {
    for (const name of classes.split(" ")) node.classList.add(name);
  }
  if (text !== undefined) node.textContent = text;

  return node;
}

export function element(tag, classes, text) {
  const node = document.createElement(tag);

  if (classes !== undefined) {
    for (const name of classes.split(" ")) node.classList.add(name);
  }
  if (text !== undefined) node.textContent = text;

  return node;
}


export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}


export function clamp(value, min, max) {
  return value < min ? min : max < value ? max : value;
}


export function restartAnimation(node, className) {
  node.classList.remove(className);
  void node.offsetWidth;
  node.classList.add(className);
}


export const query = (selector) => document.querySelector(selector);
export const queryAll = (selector) => document.querySelectorAll(selector);
