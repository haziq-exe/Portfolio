const CHARS_PER_SECOND = 350;            // typing speed for normal text
const ASCII_ART_CHARS_PER_SECOND = 10000; // much faster for ASCII art
const DELAY_BETWEEN_ELEMENTS = 100;     // ms pause after each element

const typingElements = document.querySelectorAll('.typing-text');
const phoneEl = document.getElementById('PhoneaboutMeText');
const desktopEl = document.getElementById('aboutMeText');

const phoneParent = phoneEl?.parentNode;
const desktopParent = desktopEl?.parentNode;

// Always create placeholders
const phonePlaceholder = document.createComment('PhoneaboutMeText placeholder');
const desktopPlaceholder = document.createComment('aboutMeText placeholder');

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
  // store original HTML for restart
  el.dataset.originalHtml = originalHTML;
  el.dataset.originalDisplay = originalDisplay;
  return { el, originalHTML, originalDisplay };
}

function typeElementHTMLAware({ el, originalHTML, originalDisplay }) {
  return new Promise(resolve => {
    // Parse original HTML into a temp container
    const temp = document.createElement('div');
    temp.innerHTML = originalHTML;

    // Check if this element or its children contain ASCII art
    const hasAsciiArt = el.querySelector('pre.ascii-art') !== null;
    const charsPerSecond = hasAsciiArt ? ASCII_ART_CHARS_PER_SECOND : CHARS_PER_SECOND;

    // Will hold {node: TextNode, text: originalText, isAsciiArt: boolean} entries in document order
    const textTargets = [];

    // Clear real element and make visible for animation
    el.innerHTML = '';
    el.classList.remove('waiting-to-type');
    el.classList.add('typing-animation');
    // ensure display style remains the same (helps if originally inline-block/flex)
    el.style.display = originalDisplay;

    // Build skeleton: clone element tags & attributes (cloneNode(false)) and
    // create empty text nodes where text existed; capture them in textTargets.
    function buildSkeleton(sourceNode, targetParent) {
      sourceNode.childNodes.forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) {
          const tnode = document.createTextNode('');
          targetParent.appendChild(tnode);
          // Check if this text node is inside a pre.ascii-art element
          let isInAsciiArt = false;
          if (sourceNode.classList && sourceNode.classList.contains('ascii-art')) {
            isInAsciiArt = true;
          }
          textTargets.push({ node: tnode, text: child.nodeValue, isInAsciiArt });
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          // clone tag and its attributes but not its children, then recurse
          const cloned = child.cloneNode(false);
          targetParent.appendChild(cloned);
          buildSkeleton(child, cloned);
        }
        // ignore other node types (comments etc.)
      });
    }

    buildSkeleton(temp, el);

    // Create cursor element
    const cursor = document.createElement('span');
    cursor.className = 'typing-cursor';

    // Append cursor inline with last text node (if possible)
    function attachCursor() {
      const lastEntry = textTargets[textTargets.length - 1];
      if (lastEntry && lastEntry.node.parentNode) {
        lastEntry.node.parentNode.insertBefore(cursor, lastEntry.node.nextSibling);
      } else {
        el.appendChild(cursor);
      }
    }
    attachCursor();

    // Typing loop with batching
    let nodeIndex = 0;
    let charIndex = 0;
    let accumulatedTime = 0;
    let isTyping = true;

    function step() {
      if (!isTyping) return;

      accumulatedTime += 16; // ~60fps = 16ms per frame

      // Batch type characters based on accumulated time
      while (nodeIndex < textTargets.length) {
        const currentEntry = textTargets[nodeIndex];
        const charsPerSecond = currentEntry.isInAsciiArt ? ASCII_ART_CHARS_PER_SECOND : CHARS_PER_SECOND;
        const msPerChar = 1000 / Math.max(1, charsPerSecond);
        
        if (accumulatedTime < msPerChar) {
          break;
        }
        
        if (charIndex < currentEntry.text.length) {
          const ch = currentEntry.text.charAt(charIndex);
          currentEntry.node.appendData(ch);
          charIndex++;
          accumulatedTime -= msPerChar;
        } else {
          nodeIndex++;
          charIndex = 0;
        }
      }

      // Update cursor position
      if (nodeIndex < textTargets.length) {
        const entry = textTargets[nodeIndex];
        entry.node.parentNode.insertBefore(cursor, entry.node.nextSibling);
        requestAnimationFrame(step);
      } else {
        // Finished typing
        isTyping = false;
        // Fade out cursor instead of instant removal
        cursor.style.opacity = '0';
        cursor.style.width = '0';
        cursor.style.marginLeft = '0';
        setTimeout(() => {
          cursor.remove();
          el.classList.remove('typing-animation');
          el.style.removeProperty('display');
          resolve();
        }, 50);
      }
    }

    // slight delay to let CSS apply before typing starts
    setTimeout(() => requestAnimationFrame(step), 5);
  });
}

async function runTypingSequence() {
  const prepared = Array.from(typingElements).map(prepareElement);
  for (const entry of prepared) {
    await typeElementHTMLAware(entry);
    await new Promise(r => setTimeout(r, DELAY_BETWEEN_ELEMENTS));
  }

  // ✅ Bind toggle listeners AFTER typing animation is done
  setupToggles();
}

document.querySelectorAll('.toggle-header').forEach(header => {
  header.classList.add('visible');
});

// start when DOM is ready
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