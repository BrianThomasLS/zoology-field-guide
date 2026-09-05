/*
 * Local stand-in for the YouTube Playables SDK (https://www.youtube.com/game_api/v1).
 *
 * The Unity build calls into this object from its JS bridge, so every member below
 * has to exist with the exact shape the real SDK exposes -- the engine does not
 * null-check before touching ytgame.system.isAudioEnabled() and friends.
 *
 * Behaviour differences from the hosted SDK, on purpose:
 *   - saved games live in localStorage instead of a YouTube account
 *   - ad requests resolve instantly, and rewarded ads always grant the reward
 *   - scores are kept locally rather than posted to a leaderboard
 *
 * The file is identical in every game folder; the save slot is derived from the
 * folder name so two games never share progress.
 */
(function () {
  "use strict";

  // "/epicplane/index.html" -> "epicplane"
  var folder = (location.pathname.split("/").filter(Boolean)[0] || "game").toLowerCase();
  var SAVE_KEY = folder + ".savedata";
  var SCORE_KEY = folder + ".lastscore";

  function readSavedGame() {
    try {
      return window.localStorage.getItem(SAVE_KEY) || "";
    } catch (storageBlocked) {
      return "";
    }
  }

  function writeSavedGame(payload) {
    try {
      window.localStorage.setItem(SAVE_KEY, payload);
    } catch (storageBlocked) {
      /* private browsing or a full quota -- the game keeps running regardless */
    }
  }

  // The engine expects onPause/onResume/onAudioEnabledChange to hand back an
  // unsubscribe function, so every listener registration returns one.
  function listenerGroup() {
    var listeners = [];
    return {
      add: function (callback) {
        listeners.push(callback);
        return function unsubscribe() {
          var slot = listeners.indexOf(callback);
          if (slot !== -1) listeners.splice(slot, 1);
        };
      },
      emit: function (value) {
        for (var i = 0; i < listeners.length; i++) {
          try {
            listeners[i](value);
          } catch (listenerFailed) {
            console.debug("ytgame listener threw", listenerFailed);
          }
        }
      }
    };
  }

  var pauseListeners = listenerGroup();
  var resumeListeners = listenerGroup();
  var audioListeners = listenerGroup();
  var audioEnabled = true;

  function SdkError(message, type) {
    this.name = "SdkError";
    this.message = message || "";
    this.errorType = type || 0;
  }
  SdkError.prototype = Object.create(Error.prototype);

  function announce(name) {
    document.dispatchEvent(new CustomEvent("ytplayable:" + name));
  }

  var ytgame = {
    SDK_VERSION: "1.20260817.0100",
    IN_PLAYABLES_ENV: true,
    SdkError: SdkError,
    SdkErrorType: { UNKNOWN: 0, API_UNAVAILABLE: 1, INVALID_PARAMS: 2, SIZE_LIMIT_EXCEEDED: 3, USER_CANCELLED: 4 },

    game: {
      firstFrameReady: function () {
        announce("firstframe");
      },
      gameReady: function () {
        announce("ready");
      },
      loadData: function () {
        return Promise.resolve(readSavedGame());
      },
      saveData: function (payload) {
        writeSavedGame(String(payload));
        return Promise.resolve();
      }
    },

    engagement: {
      sendScore: function (score) {
        try {
          window.localStorage.setItem(SCORE_KEY, String(score && score.value));
        } catch (storageBlocked) { /* nothing to do */ }
        return Promise.resolve();
      }
    },

    ads: {
      // No ad breaks offline: interstitials return immediately and rewarded
      // ads report the reward as earned so nothing stays locked.
      requestInterstitialAd: function () {
        return Promise.resolve();
      },
      requestRewardedAd: function () {
        return Promise.resolve(true);
      }
    },

    system: {
      isAudioEnabled: function () {
        return audioEnabled;
      },
      // Awaited by the caller, so it has to be a promise even though the
      // answer is available synchronously.
      getLanguage: function () {
        return Promise.resolve((navigator.language || "en").split("-")[0]);
      },
      onAudioEnabledChange: function (callback) {
        return audioListeners.add(callback);
      },
      onPause: function (callback) {
        return pauseListeners.add(callback);
      },
      onResume: function (callback) {
        return resumeListeners.add(callback);
      }
    },

    health: {
      logError: function (error) {
        if (error) console.debug("ytgame error", error);
      },
      logWarning: function (warning) {
        if (warning) console.debug("ytgame warning", warning);
      }
    }
  };

  // Mirror the tab's own visibility onto the pause/resume hooks the game listens for.
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) pauseListeners.emit();
    else resumeListeners.emit();
  });

  // Let the page mute the game the same way the YouTube player would.
  ytgame.setAudioEnabled = function (enabled) {
    audioEnabled = !!enabled;
    audioListeners.emit(audioEnabled);
  };

  window.ytgame = ytgame;
})();
