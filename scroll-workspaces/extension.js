const Clutter = imports.gi.Clutter;
const Lang = imports.lang;
const Main = imports.ui.main;
const ExtensionUtils = imports.misc.extensionUtils;
const Extension = ExtensionUtils.getCurrentExtension();
const Settings = Extension.imports.settings;

var WAIT_MS = 200;

function Ext() {
	this._init.apply(this, arguments);
}

Ext.prototype = {
	_init: function() {
		this._panel = Main.panel;
		this._panelBinding = null;
		this._lastScroll = new Date().getTime();
		this._ignoreLastWorkspace = false;
	},

	disable: function() {
		if (this._panelBinding) {
			this._panel.actor.disconnect(this._panelBinding);
			this._panelBinding = null;
			this.unbind();
		}
	},

	enable: function() {
		this._panel.reactive = true;
		pref = (new Settings.Prefs()).IGNORE_LAST_WORKSPACE;
		if (this._panelBinding) {
			// enabled twice in a row? should be impossible
			this.disable();
		}
		this._ignoreLastWorkspace = pref.get();
		var binding = pref.changed(Lang.bind(this, function() {
			this._ignoreLastWorkspace = pref.get();
		}));
		this.unbind = function() {
			pref.disconnect(binding);
			this.unbind = function() {};
		}
		this._panelBinding = this._panel.actor.connect('scroll-event', Lang.bind(this, this._onScrollEvent));
	},

	_activate : function (index) {
		let metaWorkspace = global.screen.get_workspace_by_index(index);
		if (metaWorkspace) metaWorkspace.activate(true);
	},

	_onScrollEvent : function(actor, event) {
		let source = event.get_source();
		if (source != actor) {
			// Actors in the "status" area often have their own scroll events,
			// so only respond to scroll events on the panel itself
			// or from the panel's center box.
			let fromCenter = this._panel._centerBox && this._panel._centerBox.contains && this._panel._centerBox.contains(source);
			if (!fromCenter) {
				return false;
			}
		}

		let direction = event.get_scroll_direction();
		let diff = 0;
		if (direction == Clutter.ScrollDirection.DOWN) {
			diff = 1;
		} else if (direction == Clutter.ScrollDirection.UP) {
			diff = -1;
		} else {
			return false;
		}

		var currentTime = new Date().getTime();
		// global.log("scroll time diff = " + (currentTime - this._lastScroll));
		if (currentTime > this._lastScroll && currentTime < this._lastScroll + WAIT_MS) {
			// within wait period - consume this event (but do nothing)
			// to prevent accidental rapid scrolling
			return true;
		}
		this._lastScroll = currentTime;


		let newIndex = global.screen.get_active_workspace().index() + diff;
		if (newIndex < global.screen.n_workspaces - 1 || !this._ignoreLastWorkspace || Main.overview.visible ) {
			this._activate(newIndex);
			return true;
		} else {
			return false;
		}
	},
}

function init(meta) {
	let ext = new Ext();
	return ext;
}

function main() {
	init().enable();
};
