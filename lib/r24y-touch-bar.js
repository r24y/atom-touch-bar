'use babel';

import {CompositeDisposable, TextEditor} from 'atom';
import {nativeImage} from 'electron';
import {TouchBar, window as remoteWindow} from 'remote';
import domtoimage from 'dom-to-image';
import {writeFileSync} from 'fs';
import {resolve} from 'path';

const {TouchBarLabel, TouchBarButton, TouchBarSpacer, TouchBarSegmentedControl, TouchBarGroup} = TouchBar;

const ICON_STYLE = 'position: absolute; top: 50%; left: 50%; transform: translate(5px) translate(-50%, -50%) scale(2);';
const TOUCHBAR_BUTTON_COLOR = '#363636';
const TOUCHBAR_BACKGROUND_COLOR = '#010101';
const TOUCHBAR_BUTTON_SELECTED_COLOR = '#767676';

function isVisible(elem) {
  // Borrowed from jQuery `jQuery.exprs.filters.visible`, with customization
  if (!elem) return false;
  return !!(elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length);
}

export default {

  subscriptions: null,

  activate(state) {

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    this.createIconImages().then(() => {
      // Register event handler that shows the TouchBar when appropriate
      this.subscriptions.add(atom.workspace.onDidStopChangingActivePaneItem(
        this.handlePaneItemChange.bind(this)));
      // Register event handler that listens for commands to be run
      this.subscriptions.add(atom.commands.onDidDispatch(
        this.handleCommandDispatch.bind(this)));
      this.handlePaneItemChange(atom.workspace.getActivePaneItem());
    });
  },

  deactivate() {
    this.hideTouchBar();
    this.subscriptions.dispose();
  },

  serialize() {
    return {};
  },

  handlePaneItemChange(textEditor) {
    this.showTouchBar(textEditor);
  },

  handleCommandDispatch(event) {
    switch (event.type) {
      case 'project-find:show':
      case 'find-and-replace:show':
      case 'project-find:toggle':
      case 'find-and-replace:toggle':
      case 'core:cancel':
        this.updateFindAndReplace(event);
        break;
      default: break;
    }
  },

  getFindReplaceElement() {
    let findReplace = document.querySelector('atom-panel > .find-and-replace')
    if (!isVisible(findReplace)) {
      findReplace = document.querySelector('atom-panel > .project-find');
    }
    if (!isVisible(findReplace)) {
      findReplace = null;
    }
    return findReplace;
  },

  updateFindAndReplace() {
    const findReplace = this.getFindReplaceElement();

    if (!findReplace) {
      this.findReplace = null;
      this.findReplaceControls = null;
      this.showTouchBar();
      return;
    }
    this.findReplace = findReplace;

    if (!this.findReplaceControls) {
      this.findReplaceControls = this.getFindReplaceControls();
    }

    this.showTouchBar();
  },

  getFindReplaceControls() {
    // Extremely hacky, don't try this at home kids.
    const findReplace = this.getFindReplaceElement();
    if (!findReplace) {
      return [];
    }
    const elem = (n) => findReplace.querySelector(`header.header .btn-group.btn-group-options .btn:nth-of-type(${1 + n})`);
    const isSelected = (index) => {
      const el = elem(index);
      if (!el) return false;
      return el.classList.contains('selected');
    };
    const buttonColor = (n) => isSelected(n) ? TOUCHBAR_BUTTON_SELECTED_COLOR : TOUCHBAR_BUTTON_COLOR;
    const buttons = [{
      label: 'Regex',
    }, {
      label: 'Case',
    }, findReplace.classList.contains('project-find') ? null : {
      label: 'Selection',
    }, {
      label: 'Word',
    }].filter(Boolean).map((opts, i) => new TouchBarButton({
      ...opts,
      backgroundColor: buttonColor(i),
      click() {
        elem(i).click();
        buttons[i].backgroundColor = buttonColor(i);
      }
    }));

    // Watch the class of each toggle button in the finder and update the background color of the
    // TouchBar button to match when it changes.
    // TODO: clean up MutationObservers when not needed
    buttons.forEach((button, i) => {
      if (!elem(i)) return;
      new MutationObserver((e) => {
        button.backgroundColor = buttonColor(i);
      }).observe(elem(i), {
        attributes: true,
        attributeFilter: ['class'],
        childList: false,
        characterData: false
      });
    });

    return buttons;
  },

  showTouchBar(editor = this.activeEditor) {
    this.activeEditor = editor;

    const projectFindToggle = new TouchBarButton({
      icon: this.icons.searchRepo,
      click: () => atom.commands.dispatch(atom.workspace.getElement(), 'project-find:toggle'),
    });

    let controls = [projectFindToggle, ...(this.findReplaceControls || [])].filter(Boolean);

    if (editor instanceof TextEditor) {
      const bookmarkSegment = new TouchBarSegmentedControl({
        mode: 'buttons',
        segments: [{
          icon: this.icons.jumpLeft,
        }, {
          icon: this.icons.bookmark,
        }, {
          icon: this.icons.jumpRight,
        }],
        change(index) {
          switch (index) {
            case 0:
              atom.commands.dispatch(editor.getElement(), 'bookmarks:jump-to-previous-bookmark');
              break;
            case 1:
              atom.commands.dispatch(editor.getElement(), 'bookmarks:toggle-bookmark');
              break;
            case 2:
              atom.commands.dispatch(editor.getElement(), 'bookmarks:jump-to-next-bookmark');
              break;
            default: break;
          }
        }
      });

      const bracketMatch = new TouchBarButton({
        label: '{...}',
        click: () => atom.commands.dispatch(editor.getElement(), 'bracket-matcher:select-inside-brackets'),
      });
      controls = [...controls, bracketMatch, new TouchBarSpacer({size: 'flexible'}), bookmarkSegment];
    }
    const touchBar = new TouchBar(controls);
    atom.getCurrentWindow().setTouchBar(touchBar);
  },

  hideTouchBar() {
    atom.getCurrentWindow().setTouchBar(null);
  },

  createIconImages() {
    return Promise.all([{
      iconName: 'bookmark',
      size: 'segment',
    }, {
      iconName: 'jump-left',
      saveAs: 'jumpLeft',
      size: 'segment',
    }, {
      iconName: 'jump-right',
      saveAs: 'jumpRight',
      size: 'segment',
    }, {
      iconName: 'searchRepo',
      innerHTML: `
        <span style="position: absolute; top: 50%; right: 0; transform: scale(1.4) translate(0, -50%);" class="icon icon-search"></span>
        <span style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(2); opacity: 0.5" class="icon icon-repo"></span>
      `,
    }, {
      iconName: 'chevron-left',
      saveAs: 'back',
    }, {
      iconName: 'textWidth',
      innerHTML: `<span style="${ICON_STYLE}" class="fa fa-text-width"></span>`
    }].map(({iconName, size, saveAs = iconName, innerHTML}) => {
      const elem = document.createElement('div');
      elem.style.color = 'white';
      elem.style.position = 'absolute';
      elem.style.top = 0;
      elem.style.left = 0;
      elem.style.width = '44px';
      elem.style.height = size === 'segment' ? '80px' : '44px';
      elem.innerHTML = innerHTML || `<span style="${ICON_STYLE}" class="icon icon-${iconName}"></span>`;
      document.body.appendChild(elem);
      return domtoimage.toPng(elem)
        .then((dataUrl) => {
          document.body.removeChild(elem);
          const image = nativeImage.createFromDataURL(dataUrl);
          const filename = resolve(__dirname, `../assets/${saveAs}.png`);
          writeFileSync(filename, image.toPNG());
          return ({[saveAs]: filename});
        });
    }))
      .then((images) => Object.assign({}, ...images))
      .then((icons) => this.icons = icons);
  }

};
