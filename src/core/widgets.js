import { el, bind, clear } from "./dom.js";
import { t } from "./i18n.js";
import { AVATAR_PARTS } from "./constants.js";

/* tooltips */

let tooltip = null;
let tooltipTarget = null;


export function showTooltip(node) {
  hideTooltip();

  tooltipTarget = node;
  const dir = node.dataset.tooltipdir || "N";

  tooltip = el("tooltip");
  tooltip.appendChild(el("tooltip-arrow"));
  tooltip.appendChild(el("tooltip-content", t(node.dataset.tooltip)));

  let fixed = false;
  for (let parent = node; parent; parent = parent.parentElement) {
    if (window.getComputedStyle(parent).position === "fixed") {
      fixed = true;
      break;
    }
  }
  tooltip.style.position = fixed ? "fixed" : "absolute";

  const rect = node.getBoundingClientRect();

  let resolvedDir = dir;
  if (resolvedDir === "N" && rect.top - window.scrollY < 48) resolvedDir = "S";
  if (resolvedDir === "S" && rect.bottom - window.scrollY > document.documentElement.clientHeight - 48) resolvedDir = "N";
  if (resolvedDir === "E" && rect.left - window.scrollX < 48) resolvedDir = "W";
  if (resolvedDir === "W" && rect.right - window.scrollX > document.documentElement.clientWidth - 48) resolvedDir = "E";

  let left = rect.left;
  let top = rect.top;

  if (resolvedDir === "N") left = (rect.left + rect.right) / 2;
  if (resolvedDir === "S") {
    left = (rect.left + rect.right) / 2;
    top = rect.bottom;
  }
  if (resolvedDir === "E") {
    left = rect.right;
    top = (rect.top + rect.bottom) / 2;
  }
  if (resolvedDir === "W") top = (rect.top + rect.bottom) / 2;

  if (!fixed) {
    left += window.scrollX;
    top += window.scrollY;
  }

  tooltip.classList.add(resolvedDir);
  tooltip.style.left = left + "px";
  tooltip.style.top = top + "px";
  document.body.appendChild(tooltip);
}

export function hideTooltip() {
  if (tooltip) {
    tooltip.remove();
    tooltipTarget = tooltip = undefined;
  }
}

export function refreshTooltip() {
  if (tooltip) tooltip.querySelector(".tooltip-content").textContent = t(tooltipTarget.dataset.tooltip);
}

export function bindTooltips(nodes) {
  bind(nodes, "pointerenter", (event) => showTooltip(event.target));
  bind(nodes, "pointerleave", () => hideTooltip());
}

/* dot pager */


export function createPager(container, count, scrollAreas, onChange) {
  const pager = {
    element: el("dots"),
    dots: [],
    selected: 0,
    change: onChange,
  };

  container.appendChild(pager.element);
  scrollAreas.push(pager.element);

  bind(scrollAreas, "DOMMouseScroll wheel", (event) => {
    if (pager.dots.length <= 1) return;

    const delta = Math.sign(-event.deltaY || event.wheelDeltaY);
    setDot(pager, Math.min(pager.dots.length - 1, Math.max(0, pager.selected - delta)), true);
    event.preventDefault();
    event.stopPropagation();
  });

  setDotCount(pager, count);
  return pager;
}

export function setDotCount(pager, count) {
  clear(pager.element);

  pager.dots = [];
  for (let i = 0; i < count; i++) {
    const dot = el("dot");
    dot.index = i;
    dot.appendChild(el("inner"));
    bind(dot, "click", function () {
      setDot(pager, this.index, true);
    });
    pager.element.appendChild(dot);
    pager.dots.push(dot);
  }

  if (pager.selected < 0) pager.selected = 0;
  if (count <= pager.selected) pager.selected = count - 1;

  setDot(pager, pager.selected, false);
}

export function setDot(pager, index, animate) {
  if (index < 0 || index >= pager.dots.length) return;

  pager.selected = index;
  for (let i = 0; i < pager.dots.length; i++) pager.dots[i].classList.remove("active");
  pager.dots[index].classList.add("active");
  pager.change(pager, index, animate);
}

/* avatars */

/**
 * build avatar element
 * @param parts    [colorIndex, eyesIndex, mouthIndex, specialIndex|-1]
 * @param isOwner  show the owner crown
 */
export function createAvatar(parts, isOwner) {
  const avatar = el("avatar");
  const color = el("color");
  const eyes = el("eyes");
  const mouth = el("mouth");
  const special = el("special");
  const owner = el("owner");

  owner.style.display = isOwner ? "block" : "none";

  avatar.appendChild(color);
  avatar.appendChild(eyes);
  avatar.appendChild(mouth);
  avatar.appendChild(special);
  avatar.appendChild(owner);
  avatar.parts = [color, eyes, mouth, special];

  updateAvatar(avatar, parts);
  return avatar;
}


export function updateAvatar(avatar, parts) {
  const setPart = (node, index, perRow) => {
    const x = -(index % perRow) * 100;
    const y = 100 * -Math.floor(index / perRow);
    node.style.backgroundPosition = x + "% " + y + "%";
  };

  setPart(avatar.querySelector(".color"), parts[0] % AVATAR_PARTS[0], 10);
  setPart(avatar.querySelector(".eyes"), parts[1] % AVATAR_PARTS[1], 10);
  setPart(avatar.querySelector(".mouth"), parts[2] % AVATAR_PARTS[2], 10);

  const special = avatar.querySelector(".special");
  if (parts[3] >= 0) {
    special.style.display = "";
    setPart(special, parts[3], 10);
  } else {
    special.style.display = "none";
  }
}


export function setAvatarOwner(avatar, isOwner) {
  avatar.querySelector(".owner").style.display = isOwner ? "block" : "none";
}


export function setAvatarFilters(avatar, filters) {
  avatar.className = "avatar";
  for (const filter of filters) avatar.classList.add("filter-" + filter);
}
