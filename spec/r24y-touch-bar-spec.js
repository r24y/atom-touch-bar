'use babel';

import R24yTouchBar from '../lib/r24y-touch-bar';

// Use the command `window:run-package-specs` (cmd-alt-ctrl-p) to run specs.
//
// To run a specific `it` or `describe` block add an `f` to the front (e.g. `fit`
// or `fdescribe`). Remove the `f` to unfocus the block.

describe('R24yTouchBar', () => {
  let workspaceElement, activationPromise;

  beforeEach(() => {
    workspaceElement = atom.views.getView(atom.workspace);
    activationPromise = atom.packages.activatePackage('r24y-touch-bar');
  });

  describe('when the r24y-touch-bar:toggle event is triggered', () => {
    it('hides and shows the modal panel', () => {
      // Before the activation event the view is not on the DOM, and no panel
      // has been created
      expect(workspaceElement.querySelector('.r24y-touch-bar')).not.toExist();

      // This is an activation event, triggering it will cause the package to be
      // activated.
      atom.commands.dispatch(workspaceElement, 'r24y-touch-bar:toggle');

      waitsForPromise(() => {
        return activationPromise;
      });

      runs(() => {
        expect(workspaceElement.querySelector('.r24y-touch-bar')).toExist();

        let r24yTouchBarElement = workspaceElement.querySelector('.r24y-touch-bar');
        expect(r24yTouchBarElement).toExist();

        let r24yTouchBarPanel = atom.workspace.panelForItem(r24yTouchBarElement);
        expect(r24yTouchBarPanel.isVisible()).toBe(true);
        atom.commands.dispatch(workspaceElement, 'r24y-touch-bar:toggle');
        expect(r24yTouchBarPanel.isVisible()).toBe(false);
      });
    });

    it('hides and shows the view', () => {
      // This test shows you an integration test testing at the view level.

      // Attaching the workspaceElement to the DOM is required to allow the
      // `toBeVisible()` matchers to work. Anything testing visibility or focus
      // requires that the workspaceElement is on the DOM. Tests that attach the
      // workspaceElement to the DOM are generally slower than those off DOM.
      jasmine.attachToDOM(workspaceElement);

      expect(workspaceElement.querySelector('.r24y-touch-bar')).not.toExist();

      // This is an activation event, triggering it causes the package to be
      // activated.
      atom.commands.dispatch(workspaceElement, 'r24y-touch-bar:toggle');

      waitsForPromise(() => {
        return activationPromise;
      });

      runs(() => {
        // Now we can test for view visibility
        let r24yTouchBarElement = workspaceElement.querySelector('.r24y-touch-bar');
        expect(r24yTouchBarElement).toBeVisible();
        atom.commands.dispatch(workspaceElement, 'r24y-touch-bar:toggle');
        expect(r24yTouchBarElement).not.toBeVisible();
      });
    });
  });
});
