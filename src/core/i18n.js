import { settings } from "./settings.js";


const dictionaries = { en: {} };

dictionaries.de = {
  "You have been kicked!": "Du wurdest gekickt!",
  "You have been banned!": "Du wurdest gebannt!",
  "You muted '$'!": "Du hast '$' stummgeschalten!",
  "You unmuted '$'!": "Du hast die Stummschaltung für '$' aufgehoben!",
  "You are on a kick cooldown!": "Du bist noch in der Kick Abklingzeit!",
  "You are banned from this room!": "Du bist von diesem Raum gebannt!",
  "You need at least 2 players to start the game!": "Du brauchst mind. 2 Spieler um das Spiel zu starten!",
  "Server restarting in about $ seconds!": "Server Neustart in ungefähr $ Sekunden!",
  "Spam detected! You're sending messages too quickly.": "Spam erkannt! Du sendest Nachrichten zu schnell.",
  "You can not votekick the lobby owner!": "Du kannst den Raumbesitzer nicht kicken!",
  "The word was '$'": "Das Wort war '$'",
  "$ is drawing now!": "$ zeichnet nun!",
  "$ is now the room owner!": "$ ist nun der Raumeigentümer!",
  "$ is voting to kick $ ($/$)": "$ möchte $ kicken ($/$)!",
  "$ joined the room!": "$ ist dem Raum beigetreten!",
  "$ left the room!": "$ hat den Raum verlassen!",
  "$ has been kicked!": "$ wurde gekickt!",
  "$ has been banned!": "$ wurde gebannt!",
  "$ guessed the word!": "$ hat das Wort erraten!",
  "$ liked the drawing!": "$ mag die Zeichnung!",
  "$ disliked the drawing!": "$ mag die Zeichnung nicht!",
  "$ is close!": "$ ist nah dran!",
  "$ is choosing a word!": "$ wählt ein Wort!",
  "$ won with a score of $!": "$ hat mit einem Punktestand von $ gewonnen!",
  "$ and $ won with a score of $!": "$ und $ haben mit einem Punktestand von $ gewonnen!",
  WAITING: "WARTEN",
  "DRAW THIS": "ZEICHNE",
  "WORD HIDDEN": "WORT VERSTECKT",
  "GUESS THIS": "RATE",
  "$ (You)": "$ (Du)",
  "$ points": "$ Punkte",
  "Room not found!": "Raum nicht gefunden!",
  "Room is full!": "Raum ist voll!",
  "No rooms found!": "Keine Räume gefunden!",
  "An unknown error ('$')": "Unbekannter Fehler ('$')",
  "Something went wrong!": "Etwas ist schief gelaufen!",
  "Disconnected!": "Verbindung getrennt!",
  "Connection lost!": "Verbindung verloren!",
  "Servers are currently undergoing maintenance!": "Server werden derzeit gewartet",
  "Please try again later!": "Bitte versuch es später noch einmal!",
  "An unknown error occurred ('$')": "Ein unbekannter Fehler ist aufgetreten ('$')",
  Unmute: "Stumm. aufheben",
  Mute: "Stummschalten",
  Rooms: "Räume",
  Settings: "Einstellungen",
  "Not started": "Nicht gestartet",
  Round: "Runde",
  Rounds: "Runden",
  "Round $": "Runde $",
  "Round $ of $": "Runde $ von $",
  "Waiting for players...": "Auf Spieler warten...",
  "Game starting in a few seconds...": "Das Spiel beginnt in wenigen Sekunden...",
  "is the winner!": "hat gewonnen!",
  "are the winners!": "haben gewonnen!",
  "Nobody won!": "Niemand hat gewonnen!",
  "Choose a word": "Wähle ein Wort",
  "The word was": "Das Wort war",
  User: "Spieler",
  Play: "Spielen",
  "Create Room": "Raum erstellen",
  "View Rooms": "Räume ansehen",
  "How to play": "Wie gespielt wird",
  About: "Über",
  News: "Neuigkeiten",
  "When it's your turn, choose a word you want to draw!": "Wähle ein Wort, das du zeichnen willst, wenn du dran bist!",
  "Try to draw your choosen word! No spelling!": "Versuche nun dein Wort zu zeichnen. Kein Schreiben!",
  "Let other players try to guess your drawn word!": "Lass andere Mitspieler dein gezeichnetes Wort erraten!",
  "When it's not your turn, try to guess what other players are drawing!": "Wenn du nicht dran bist mit Zeichnen, versuche die Zeichnungen anderer zu erraten!",
  "Score the most points and be crowned the winner at the end!": "Sammel die meisten Punkte und werde zum Gewinner!",
  "is a free online multiplayer drawing and guessing pictionary game.": "ist ein kostenloses Mehrspieler-Zeichnen und Raten- / Montagsmaler-Spiel.",
  "A normal game consists of a few rounds, where every round a player has to draw their chosen word and others have to guess it to gain points!": "Ein normales Spiel besteht aus drei Runden, in welcher jeder Spieler sein gewähltes Wort zeichnen muss, während die Anderen es für Punkte erraten müssen!",
  "The person with the most points at the end of the game, will then be crowned as the winner!": "Die Person mit dem höchsten Punktestand am Ende des Spiels wird als Sieger gekrönt!",
  "Have fun!": "Viel Spaß!",
  "Invite your friends!": "Lad deine Freunde ein!",
  Copy: "Kopieren",
  "Hover over me to see the Invite link!": "Einladungslink hier anschauen!",
  "Click to copy the link to this room!": "Klicke um den Einladungslink zu kopieren!",
  Visibility: "Sichtbarkeit",
  Name: "Name",
  Players: "Spieler",
  Drawtime: "Zeit",
  Language: "Sprache",
  "Word Mode": "Wort-Modus",
  "Word Count ": "Wort-Anzahl",
  Hints: "Hinweise",
  "Custom words": "Eigene Wörter",
  "Minimum of 10 words. 1-32 characters per word! 10000 characters maximum. Separated by a , (comma)": "Minimum von 10 Wörtern. 1-32 Buchstaben pro Wort. 10000 Buchstaben maximal. Getrennt durch ein , (Komma)",
  "Use custom words only": "Nur eigene Wörter benutzen",
  "Start!": "Starten!",
  All: "Alle",
  Custom: "Benutzerdefiniert",
  Public: "Öffentlich",
  Private: "Privat",
  Mode: "Modus",
  Normal: "Normal",
  Hidden: "Versteckt",
  Combination: "Kombination",
  "Please select the reasons for your report": "Bitte wählen Sie die Gründe für Ihre Meldung",
  "Inappropriate Messages / Drawings": "Unangemessene Nachrichten / Zeichnungen",
  Spam: "Spam",
  "Botting / Cheating": "Botting / Cheating",
  "Your report for '$' has been sent!": "Deine Meldung für '$' wurde abgesendet!",
  "Enter your name": "Gib dein Namen ein",
  "Filter rooms by name here...": "Suche nach Räume hier...",
  "Type your guess here...": "Rate das gesuchte Wort hier...",
  "Everyone guessed the word!": "Jeder hat das Wort erraten!",
  "The drawer left the game!": "Der Zeichner hat das Spiel verlassen!",
  "Time is up!": "Die Zeit ist abgelaufen!",
  Kick: "Kicken",
  Ban: "Bannen",
  Votekick: "Votekicken",
  Report: "Melden",
  "Randomize your Avatar!": "Zufälliger Avatar!",
  Brush: "Stift",
  Colorpick: "Pipette",
  Fill: "Füllen",
  Undo: "Rückgängig",
  Clear: "Löschen",
  "Mute audio": "Stummschalten",
  "Unmute audio": "Stumm. aufheben",
  "Turn the lights off": "Lichter ausmachen",
  "Turn the lights on": "Lichter anmachen",
  "Hotkeys & Misc.": "Tastenkürzel & Sonstiges",
  Hotkeys: "Tastenkürzel",
  Miscellaneous: "Sonstiges",
  "Display Language": "Anzeigesprache",
  "Filter bad words in chat": "Schlechte Wörter im Chat filtern",
  "Brush Pressure Sensitivity": "Stiftdruckempfindlichkeit",
  Reset: "Zurücksetzen",
  "Reset hotkeys to default": "Tastenkürzel zurücksetzen",
  On: "An",
  Off: "Aus",
};


const registered = [];

function lookup(dictionary, key) {
  const value = dictionary[key];
  return value != null && value !== "" ? value : key;
}


export function t(key, args) {
  const dictionary = dictionaries[settings.displayLang];
  const template = lookup(dictionary, key);

  if (args === undefined) return template;

  const list = Array.isArray(args) ? args : [args];
  let result = "";
  let argIndex = 0;

  for (let i = 0; i < template.length; i++) {
    if (template.charAt(i) === "$") {
      result += list[argIndex];
      argIndex++;
    } else {
      result += template.charAt(i);
    }
  }

  return result;
}

export function registerTranslation(node, type) {
  if (type === "children") {
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      registerTranslation(child, child.dataset.translate ?? "text");
    }
    return;
  }

  let key = "";
  if (type === "text") key = node.textContent;
  if (type === "placeholder") key = node.placeholder;

  if (key.length > 0) {
    registered.push({ key, element: node, type });
  } else {
    console.log("Empty key passed to translate with!");
    console.log(node);
  }
}


export function collectTranslations(elements) {
  for (const node of elements) {
    registerTranslation(node, node.dataset.translate);
  }
}


export function applyTranslations() {
  const dictionary = dictionaries[settings.displayLang];

  for (const entry of registered) {
    const value = lookup(dictionary, entry.key);
    if (entry.type === "text") entry.element.textContent = value;
    if (entry.type === "placeholder") entry.element.placeholder = value;
  }
}
