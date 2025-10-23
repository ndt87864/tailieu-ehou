function(root){*/

  if (typeof root === 'undefined') return;

  try {(function(root){

    var global = root;  if (typeof root === 'undefined') return;

  try {

    // Minimal no-op analytics API surface    var global = root;

    var analyticsCompat = {

      // isSupported should resolve false so callers avoid initializing analytics    // Minimal no-op analytics API surface

      isSupported: function(){ return Promise.resolve(false); },    var analyticsCompat = {

      settings: function(){ /* no-op */ },      // isSupported should resolve false so callers avoid initializing analytics

      EventName: {},      isSupported: function(){ return Promise.resolve(false); },

      // Minimal class placeholder      settings: function(){ /* no-op */ },

      Analytics: function(){},      EventName: {},

    };      // Minimal class placeholder

      Analytics: function(){},

    // Expose shim on a non-conflicting global symbol so code can check for it    };

    global.__firebase_analytics_compat_noop = analyticsCompat;

    // Expose shim on a non-conflicting global symbol so code can check for it

    // If firebase-compat is present, set a harmless flag to indicate analytics is disabled    global.__firebase_analytics_compat_noop = analyticsCompat;

    if (global.firebase) {

      try {    // If firebase-compat is present, set a harmless flag to indicate analytics is disabled

        global.firebase.__analyticsCompatNoop = true;    if (global.firebase) {

      } catch (e) { /* ignore */ }      try {

    }        global.firebase.__analyticsCompatNoop = true;

  } catch (e) {      } catch (e) { /* ignore */ }

    try { console.error('analytics-compat shim setup error', e); } catch(e){}    }

  }  } catch (e) {

})(this);    try { console.error('analytics-compat shim setup error', e); } catch(e){}

  }
})(this);

// firebase-analytics-compat.js (NO-OP shim)
// This file replaces the original analytics compat library to ensure Manifest V3 compliance.
// It provides a minimal, local, no-op analytics API surface and prevents any remote script loading.

(function(root){
  if (typeof root === 'undefined') return;
  try {
    var global = root;
    var analyticsCompat = {
      isSupported: function(){ return Promise.resolve(false); },
      settings: function(){ /* no-op */ },
      EventName: {},
      Analytics: function(){},
    };
    global.__firebase_analytics_compat_noop = analyticsCompat;
    if (global.firebase) {
      try {
        global.firebase.__analyticsCompatNoop = true;
      } catch (e) { /* ignore */ }
    }
  } catch (e) {
    try { console.error('analytics-compat shim setup error', e); } catch(e){}
  }
})(this);
