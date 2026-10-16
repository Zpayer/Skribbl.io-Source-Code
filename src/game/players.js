import { el, bind, restartAnimation } from "../core/dom.js";
import { t } from "../core/i18n.js";
import { game } from "../core/state.js";
import { ADMIN_FLAG, ModalType } from "../core/constants.js";
import { playersList, playersFooter, playersPanel } from "../core/elements.js";
import { createAvatar, setAvatarFilters, createPager, setDotCount } from "../core/widgets.js";
import { openModal } from "../core/modal.js";


let playersPager = null;


export function findUser(id) {
  for (const user of game.users) {
    if (user.id == id) return user;
  }
}


export function userFilters(user) {
  return (user.flags & ADMIN_FLAG) == ADMIN_FLAG ? ["glow", "hue-rotate"] : [];
}


export function setGuessed(user, guessed) {
  user.guessed = guessed;
  if (guessed) user.element.classList.add("guessed");
  else user.element.classList.remove("guessed");
}


export function setDrawingIndicator(user, visible) {
  user.element.drawing.style.display = visible ? "block" : "none";
}

export function updateRanks() {
  const sorted = [...game.users].sort((a, b) => b.score - a.score);

  let rank = 1;
  for (let i = 0; i < sorted.length; i++) {
    const user = sorted[i];
    user.rank = rank;

    const score = user.element.querySelector(".player-score");
    score.textContent = t("$ points", user.score);

    const rankNode = user.element.querySelector(".player-rank");
    rankNode.textContent = "#" + rank;
    rankNode.classList.remove("first", "second", "third");
    if (rank == 1) rankNode.classList.add("first");
    if (rank == 2) rankNode.classList.add("second");
    if (rank == 3) rankNode.classList.add("third");

    if (i < sorted.length - 1 && sorted[i].score > sorted[i + 1].score) rank++;
  }
}

export function updatePager() {
  let perPage = getComputedStyle(playersPanel).getPropertyValue("--PLAYERS_PER_PAGE");

  if (Number(perPage) <= 0) {
    const height = Math.max(48, playersPanel.clientHeight);
    perPage = Math.floor(height / 48);
  }
  perPage = Number(perPage);

  const pageCount = Math.ceil(game.users.length / perPage);

  for (let i = 0; i < game.users.length; i++) {
    game.users[i].page = Math.floor(i / perPage);
  }

  const showPage = (pager, page) => {
    const visible = [];
    for (const user of game.users) {
      const onThisPage = user.page == page;
      user.element.style.display = onThisPage ? "" : "none";
      if (onThisPage) visible.push(user.element);
    }

    for (let i = 0; i < visible.length; i++) {
      visible[i].classList.remove("first");
      visible[i].classList.remove("last");
      if (i % 2 == 0) visible[i].classList.remove("odd");
      else visible[i].classList.add("odd");
    }

    if (visible.length > 0) {
      visible[0].classList.add("first");
      visible[visible.length - 1].classList.add("last");
    }
  };

  if (playersPager == null) {
    playersPager = createPager(playersFooter, pageCount, [playersList], (pager, page) =>
      showPage(pager, page)
    );
  } else {
    setDotCount(playersPager, pageCount);
  }

  playersPager.element.style.display = pageCount > 1 ? "" : "none";
}

export function createUser(raw, animate) {
  const user = {
    id: raw.id,
    flags: raw.flags,
    name: raw.name,
    avatar: raw.avatar,
    score: raw.score,
    guessed: raw.guessed,
    rank: 0,
    muted: false,
    votekick: false,
    reported: false,
    page: 0,
    element: el("player"),
    bubble: undefined,
    joinTimeout: undefined,
  };

  game.users.push(user);

  const displayName = user.id == game.myId ? t("$ (You)", user.name) : user.name;
  const isAdmin = (user.flags & ADMIN_FLAG) == ADMIN_FLAG;

  if (isAdmin) user.element.classList.add("admin");


  const background = el("player-background");
  user.element.appendChild(background);
  if (isAdmin) {
    for (let i = 0; i < 7; i++) background.appendChild(el("background-bubble"));
  } else {
    for (let i = 0; i < 3; i++) background.appendChild(el("background-wave"));
  }

  const avatarContainer = el("player-avatar-container");
  const avatar = createAvatar(user.avatar);
  user.element.drawing = el("drawing");
  user.element.avatar = avatar;
  avatar.appendChild(user.element.drawing);
  avatarContainer.appendChild(avatar);
  user.element.appendChild(avatarContainer);
  playersList.appendChild(user.element);
  setAvatarFilters(avatar, userFilters(user));

  const info = el("player-info");
  const nameNode = el("player-name", displayName);
  if (user.id == game.myId) nameNode.classList.add("me");
  info.appendChild(nameNode);
  info.appendChild(el("player-rank", "#" + user.rank));
  info.appendChild(el("player-score", t("$ points", user.score)));
  if (isAdmin) info.appendChild(el("player-tag", "ADMIN"));
  user.element.appendChild(info);

  bind(user.element, "click", () => {
    game.selectedPlayer = user;
    openModal(ModalType.PLAYER, user);
  });

  const icons = el("player-icons");
  const ownerIcon = el("icon owner");
  const muteIcon = el("icon muted");
  icons.appendChild(ownerIcon);
  icons.appendChild(muteIcon);
  user.element.appendChild(icons);
  user.element.icons = [ownerIcon, muteIcon];

  setGuessed(user, user.guessed);
  if (animate) updatePager();

  return user;
}

export function removeUser(id) {
  for (let i = 0; i < game.users.length; i++) {
    const user = game.users[i];
    if (user.id == id) {
      game.users.splice(i, 1);
      user.element.remove();
      updateRanks();
      updatePager();
      return user;
    }
  }
}


export function resetScores() {
  for (const user of game.users) user.score = 0;
  for (const user of game.users) {
    setGuessed(user, false);
    setDrawingIndicator(user, false);
  }
  updateRanks();
}
