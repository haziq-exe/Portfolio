const CHARS_PER_SECOND = 850;            
const ASCII_ART_CHARS_PER_SECOND = 30000;
const DELAY_BETWEEN_ELEMENTS = 100;

const typingElements = document.querySelectorAll('.typing-text');
const phoneEl = document.getElementById('PhoneaboutMeText');
const desktopEl = document.getElementById('aboutMeText');

const phoneParent = phoneEl?.parentNode;
const desktopParent = desktopEl?.parentNode;


const phonePlaceholder = document.createComment('PhoneaboutMeText placeholder');
const desktopPlaceholder = document.createComment('aboutMeText placeholder');

const sound = document.getElementById("clickSound");

function checkSize() {
  if (window.innerWidth < 900) {
    // Remove desktop version (if still present)
    if (desktopEl.parentNode) {
      desktopParent.replaceChild(desktopPlaceholder, desktopEl);
    }
    // Add phone version (if missing)
    if (!phoneEl.parentNode && phonePlaceholder.parentNode) {
      phonePlaceholder.parentNode.replaceChild(phoneEl, phonePlaceholder);
    }
  } else {
    // Remove phone version (if still present)
    if (phoneEl.parentNode) {
      phoneParent.replaceChild(phonePlaceholder, phoneEl);
    }
    // Add desktop version (if missing)
    if (!desktopEl.parentNode && desktopPlaceholder.parentNode) {
      desktopPlaceholder.parentNode.replaceChild(desktopEl, desktopPlaceholder);
    }
  }
}

window.addEventListener('resize', checkSize);
checkSize();





function prepareElement(el) {
  const originalHTML = el.innerHTML;
  const originalDisplay = window.getComputedStyle(el).display;
  el.classList.add('waiting-to-type');
  
  el.dataset.originalHtml = originalHTML;
  el.dataset.originalDisplay = originalDisplay;
  return { el, originalHTML, originalDisplay };
}

function typeElementHTMLAware({ el, originalHTML, originalDisplay }) {
  return new Promise(resolve => {

    const temp = document.createElement('div');
    temp.innerHTML = originalHTML;


    const textTargets = [];

    el.innerHTML = '';
    el.classList.remove('waiting-to-type');
    el.classList.add('typing-animation');

    el.style.display = originalDisplay;


    function buildSkeleton(sourceNode, targetParent) {
      sourceNode.childNodes.forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) {
          const tnode = document.createTextNode('');
          targetParent.appendChild(tnode);
          let isInAsciiArt = false;

          if (sourceNode.classList && sourceNode.classList.contains('ascii-art')) {
            isInAsciiArt = true;
          }
          textTargets.push({ node: tnode, text: child.nodeValue, isInAsciiArt });
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          const cloned = child.cloneNode(false);
          targetParent.appendChild(cloned);
          buildSkeleton(child, cloned);
        }
        
      });
    }

    buildSkeleton(temp, el);

    function isAllSpaces(str) {
        return str.length > 0 && [...str].every(ch => ch === " " || ch === "\n");
    }


    const cursor = document.createElement('span');
    cursor.className = 'typing-cursor';
    cursor.style.display = 'hidden';

    let nodeIndex = 0;
    let charIndex = 0;
    let accumulatedTime = 0;
    let isTyping = true;

    function step() {
      if (!isTyping) return;

      accumulatedTime += 5;

      
      while (nodeIndex < textTargets.length) {
        const currentEntry = textTargets[nodeIndex];
        const charsPerSecond = currentEntry.isInAsciiArt ? ASCII_ART_CHARS_PER_SECOND : CHARS_PER_SECOND;
        const msPerChar = 1000 / Math.max(1, charsPerSecond);
        
        if (accumulatedTime < msPerChar) {
          break;
        }
        
        if (charIndex < currentEntry.text.length && !(isAllSpaces(currentEntry.text))) {
          const ch = currentEntry.text.charAt(charIndex);
          if (nodeIndex < 10 && currentEntry.isInAsciiArt === false) {
            cursor.style.display = 'none';
          }
          currentEntry.node.appendData(ch);
          charIndex++;
          accumulatedTime -= msPerChar;
        } else {
          nodeIndex++;
          charIndex = 0;
        }
      }



      
      if (nodeIndex < textTargets.length - 1) {
        const entry = textTargets[nodeIndex];
        if (entry.isInAsciiArt === false) {
          cursor.style.display = "";
          entry.node.parentNode.insertBefore(cursor, entry.node.nextSibling);
        }
        else {
          cursor.style.display = "none";
        }
        requestAnimationFrame(step);
      } else {
        isTyping = false;
        setTimeout(() => {
          cursor.remove();
          el.classList.remove('typing-animation');
          el.style.removeProperty('display');
          resolve();
        }, 50);
      }
    }

    setTimeout(() => requestAnimationFrame(step), 5);
  });
}

async function runTypingSequence() {
  const prepared = Array.from(typingElements).map(prepareElement);
  for (const entry of prepared) {
    await typeElementHTMLAware(entry);
    await new Promise(r => setTimeout(r, DELAY_BETWEEN_ELEMENTS));
  }

  setupToggles();
}

document.querySelectorAll('.toggle-header').forEach(header => {
  header.classList.add('visible');
});


window.addEventListener('DOMContentLoaded', runTypingSequence);

function setupToggles() {
  const toggles = document.querySelectorAll(".toggle-header");
  toggles.forEach(header => {
    header.addEventListener("click", () => {
      const targetId = header.dataset.target;
      const content = document.getElementById(targetId);

      header.classList.toggle("active");
      header.classList.toggle('open');
      content.classList.toggle("show");
    });
  });
}

function playClickSound() {
  sound.currentTime = 0;
  sound.volume = 0.25;
  sound.play();
}