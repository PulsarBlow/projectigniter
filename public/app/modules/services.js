!function (angular) {
    "use strict";

    angular.module("app.services", [])

        .factory("names", ["fbutil", function namesFactory(fbutil) {
            return fbutil.syncArray("names");
        }])

        .factory("appData", ["fbutil", function appDataFactory(fbutil) {
            return fbutil.syncObject("app");
        }])

        .factory("appCounters", ["fbutil", function appCountersFactory(fbutil) {
            var sync = fbutil.syncObject("counters");
            return {
                sync: sync,
                addVotesDeleted: function () {
                    sync.votes_deleted++;
                    sync.$save();
                },
                addVotesSaved: function () {
                    sync.votes_saved++;
                    sync.$save();
                }
            };
        }])

        .factory("votes", ["$q", "fbutil", "appCounters", "activityService", function votesFactory($q, fbutil, appCounters, activityService) {


            function createVoteData(user, userProfile, voteSet) {
                if (!user || !userProfile || !voteSet || !angular.isArray(voteSet)) {
                    throw new Error("Invalid arguments");
                }
                // Order voteSet by descending points value
                voteSet.sort(function (item1, item2) {
                    return item2.points - item1.points;
                });
                var data = {
                    userInfo: {
                        displayName: user.displayName || "Anonymous",
                        pageUrl: userProfile.pageUrl || null,
                        pictureUrl: userProfile.pictureUrl || null
                    },
                    date: +moment().utc(),
                    voteItems: []
                };
                voteSet.forEach(function (item, index) {
                    data.voteItems[item.id] = item;
                });
                return data;
            }

            var syncUserVote = function (userId) {
                return fbutil.syncObject("userVotes/" + userId);
            };

            return {
                syncVotes: function () {
                    return fbutil.syncArray("userVotes");
                },
                syncUserVote: syncUserVote,
                saveVote: function (user, userProfile, voteSet) {
                    if (!user || !userProfile || !voteSet || !angular.isArray(voteSet)) {
                        throw new Error("Invalid argument");
                    }

                    var fb = fbutil.fb("userVotes"),
                        data = createVoteData(user, userProfile, voteSet);
                    return fb.$set(user.id, data).then(function () {
                        appCounters.addVotesSaved();
                        activityService.publish("userVoteSaved", user, userProfile);
                    });
                },
                deleteVote: function (user, userProfile) {
                    if (!user || !userProfile) {
                        throw new Error("Invalid arguments");
                    }

                    var fb = fbutil.fb("userVotes");
                    return fb.$remove(user.id).then(function () {
                        appCounters.addVotesDeleted();
                        activityService.publish("userVoteDeleted", user, userProfile);
                    });
                }
            };
        }])

        .factory("userData", ["$log", "$FirebaseObject", "$firebase", "fbutil", "activityService", "FBURL", "ANONYMOUS_ID", "LOCAL_PROVIDER",
            function userDataFactory($log, $FirebaseObject, $firebase, fbutil, activityService, FBURL, ANONYMOUS_ID, LOCAL_PROVIDER) {

                function guardUserLoginInfo(userLoginInfo) {
                    if (!angular.isObject(userLoginInfo)) {
                        throw new Error("userLoginInfo is not an object");
                    }

                    if (!userLoginInfo.uid) {
                        throw new Error("userLoginInfo.uid is not valid");
                    }
                }

                function parseUser(data) {
                    if (!angular.isObject(data) || !data) {
                        return null;
                    }
                    return {
                        id: data.uid || ANONYMOUS_ID,
                        provider: data.provider || LOCAL_PROVIDER,
                        providerId: data.id || ANONYMOUS_ID,
                        accessToken: data.accessToken || null,
                        displayName: data.displayName || "Anonymous"
                    }
                }

                function parseUserProfile(data) {

                    if (!angular.isObject(data) || !angular.isObject(data.thirdPartyUserData)) {
                        return null;
                    }
                    return parseProviderData(data.provider, data.thirdPartyUserData);
                }

                function parseProviderData(provider, providerUserData) {
                    if (!angular.isString(provider) || !provider) {
                        throw new Error("Invalid provider");
                    }
                    if (!angular.isObject(providerUserData)) {
                        throw new Error("Invalid providerUserData");
                    }

                    switch (angular.lowercase(provider)) {
                        case "facebook":
                            return parseFacebookData(providerUserData);
                        case "google":
                            return parseGoogleData(providerUserData);
                        default:
                            throw new Error("Unable to parse user. Provider [" + provider + "] is not supported");
                    }
                }

                function parseFacebookData(data) {
                    if (!data) {
                        return {};
                    }
                    return {
                        email: data.email || null,
                        emailVerified: false,
                        realName: data.name || null,
                        gender: data.gender || null,
                        pageUrl: data.link || null,
                        pictureUrl: parsePictureUrl(data.picture),
                        locale: data.locale || "fr_FR"
                    };

                    function parsePictureUrl(pictureObj) {
                        if (!angular.isObject(pictureObj) || !pictureObj || !pictureObj.data) {
                            return null;
                        }
                        return pictureObj.data.url;
                    }
                }

                function parseGoogleData(data) {
                    if (!data) {
                        return {};
                    }
                    return {
                        email: data.email || null,
                        emailVerified: data.verified_email || false,
                        realName: data.name || null,
                        gender: data.gender || null,
                        pageUrl: data.link || null,
                        pictureUrl: data.picture || null,
                        locale: data.locale || "fr_FR"
                    };
                }

                return {

                    parseUserLoginInfo: function (userLoginInfo) {
                        return {
                            user: parseUser(userLoginInfo),
                            userProfile: parseUserProfile(userLoginInfo)
                        };
                    },

                    /**
                     * Create user data record if it doesn't exist in firebase
                     * @param userLoginInfo
                     * @returns {Promise} A deferred promise
                     */
                    tryCreateUser: function (userLoginInfo) {
                        guardUserLoginInfo(userLoginInfo);

                        var $fb = fbutil.fb("users/" + userLoginInfo.uid),
                        // These 2 are caches to not parse during transaction completion
                            user = parseUser(userLoginInfo),
                            userProfile = parseUserProfile(userLoginInfo);

                        return $fb.$transaction(function (currentData) {
                            if (currentData === null) {
                                return parseUser(userLoginInfo);
                            }
                        }).then(function (result) {
                            if (angular.isObject(result)) {
                                activityService.publish("usersignedup", user, userProfile);
                            }
                        });
                    },

                    /**
                     * Create userProfile data record if it doesn't exist in firebase
                     * @param userLoginInfo
                     * @returns {Promise} A deferred promise
                     */
                    tryCreateUserProfile: function (userLoginInfo) {
                        guardUserLoginInfo(userLoginInfo);

                        var $fb = fbutil.fb("userProfiles/" + userLoginInfo.uid);

                        return $fb.$transaction(function (currentData) {
                            if (currentData === null) {
                                return parseUserProfile(userLoginInfo);
                            }
                        });
                    },

                    /**
                     * Create userConfig data record if it doesn't exist in firebase
                     * @param userLoginInfo
                     * @returns {Promise} A deferred promise
                     */
                    tryCreateUserConfig: function (userLoginInfo) {
                        guardUserLoginInfo(userLoginInfo);

                        var $fb = fbutil.fb("userConfigs/" + userLoginInfo.uid);

                        return $fb.$transaction(function (currentData) {
                            if (currentData === null) {
                                return {
                                    navCollapsed: false,
                                    emailOnVoteEnd: false
                                };
                            }
                        });
                    },

                    /**
                     * Create a synchronized user
                     * @param userId
                     * @returns {*}
                     */
                    syncUser: function (userId) {
                        var ref = new Firebase(FBURL).child("users").child(userId);
                        var sync = $firebase(ref);
                        return sync.$asObject();
                    },

                    /**
                     * Create a synchronized userProfile
                     * @param userId
                     * @returns {*}
                     */
                    syncUserProfile: function (userId) {
                        var ref = new Firebase(FBURL).child("userProfiles").child(userId);
                        var sync = $firebase(ref);
                        return sync.$asObject();
                    },

                    /**
                     * Create a synchronized user config
                     * @param userId
                     * @returns {*}
                     */
                    syncUserConfig: function (userId) {
                        var ref = new Firebase(FBURL).child("userConfigs").child(userId);
                        var sync = $firebase(ref);
                        return sync.$asObject();
                    },

                    /**
                     * Create a synchronized array containing vote for a given user
                     * @param userId
                     * @returns {*}
                     */
                    syncUserVote: function (userId) {
                        var ref = new Firebase(FBURL).child("userVotes").child(userId);
                        var sync = $firebase(ref);
                        return sync.$asArray();
                    }
                };
            }])

        .factory("userFavorites", ["MAX_FAVORITES", function userFavoritesFactory(MAX_FAVORITES) {
            var userFavorites = new FavoriteDictionary(MAX_FAVORITES);
            return userFavorites;
        }])

        .factory("counterService", ["$FirebaseObject", "fbutil", function ($FirebaseObject, fbutil) {

            var VoteCountersFactory = $FirebaseObject.$extendFactory({
               plusSaved: function() {
                   this.saved = this.saved || 0;
                   this.saved++;
                   this.$save();
               },
                plusDeleted: function() {
                 this.deleted = this.deleted || 0;
                    this.deleted++;
                    this.$save();
                }
            });


            return {
                voteCounters: function (voteId) {
                    if (!voteId) {
                        throw new Error("voteId argument is not valid");
                    }
                    return fbutil.fb("counters/votes/" + voteId, {
                        objectFactory: VoteCountersFactory
                    }).$asObject();
                }
            };
        }])

        .factory("activityService", ["$q", "$log", "$rootScope", "fbutil", "ACTIVITY_LIMIT", function activitiesFactory($q, $log, $rootScope, fbutil, ACTIVITY_LIMIT) {

            var messages = {
                usersignedup: {
                    title: "Nouvel arrivant!",
                    content: "{{displayName}} vient de rejoindre notre petite communauté. Bienvenue à lui/elle !",
                    type: "primary",
                    icon: "child"
                },
                usersignedin: {
                    title: "Connexion",
                    content: "{{displayName}} s'est connecté.",
                    type: "info",
                    icon: "sign-in"
                },
                usersignedout: {
                    title: "Déconnexion",
                    content: "{{displayName}} s'est déconnecté.",
                    type: "default",
                    icon: "sign-out"
                },
                uservotesaved: {
                    title: "A voté",
                    content: "{{displayName}} a voté. Merci à lui.",
                    type: "success",
                    icon: "heart"
                },
                uservotedeleted: {
                    title: "N'aime plus son vote",
                    content: "{{displayName}} n'aimait pas son vote et l'a supprimé.",
                    type: "danger",
                    icon: "undo"
                },
                hasKey: function (keyName) {
                    if (!keyName) {
                        return false;
                    }
                    return (keyName.toLowerCase() in messages);
                },
                getMessage: function (messageName) {
                    if (!messageName || !messages.hasKey(messageName)) {
                        throw new Error("unknown message : " + messageName);
                    }
                    return messages[messageName.toLowerCase()];
                }
            };

            function createActivity(activityName, user, userProfile) {
                var message = messages.getMessage(activityName);
                var templateValues = {
                    displayName: (user && user.displayName) ? user.displayName : "Anonymous"
                };
                return {
                    date: moment().utc().toISOString(),
                    title: S(message.title).template(templateValues).s,
                    content: S(message.content).template(templateValues).s,
                    type: message.type,
                    icon: message.icon,
                    userInfo: createUserInfo(user, userProfile)
                };

                function createUserInfo(user, userProfile) {
                    if (!user || !user.id || !user.displayName) {
                        return null;
                    }

                    return {
                        id: user.id,
                        displayName: user.displayName || "Anonymous",
                        pageUrl: userProfile && userProfile.pageUrl
                            ? userProfile.pageUrl : null,
                        pictureUrl: userProfile && userProfile.pictureUrl
                            ? userProfile.pictureUrl : null
                    };
                }
            }

            function saveActivity(activity) {
                var activitiesRef = fbutil.ref("activities"),
                    newActivityRef = activitiesRef.push(),
                    priority = +moment("2030-01-01T00:00:00") - +moment(),
                    dfd = $q.defer();
                newActivityRef.setWithPriority(activity, priority, function (err) {
                    if (err) {
                        dfd.reject(err);
                    } else {
                        dfd.resolve(activity);
                    }
                });
                return dfd.promise;
            };

            return {

                /**
                 * Publish an activity and returns a promise which
                 * resolve with the created activity
                 * @param activityName
                 * @param user
                 * @param userProfile
                 * @returns {*}
                 */
                publish: function (activityName, user, userProfile) {
                    if (!messages.hasKey(activityName)) {
                        var dfd = $q.defer();
                        dfd.reject("unknown activity " + activityName);
                        return dfd.promise;
                    }
                    var activity = createActivity(activityName, user, userProfile);
                    $log.debug("publishing activity", activity);
                    return saveActivity(activity);
                },

                /**
                 * Returns true if the activity is a known activity
                 * @param activityName
                 */
                exist: function (activityName) {
                    return messages.hasKey(activityName);
                },

                sync: function (limit) {
                    return fbutil.syncArray("activities", {limit: limit || ACTIVITY_LIMIT });
                },

                like: function (id, user, userProfile) {
                    if (!id) {
                        return;
                    }
                    var activityRef = fbutil.ref("activities").child(id).child("likers").child(user.id);
                    activityRef.set({displayName: user.displayName, pictureUrl: userProfile.pictureUrl });
                }
            };
        }])

        .factory("voteService", ["$q","$FirebaseObject", "$FirebaseArray", "fbutil", "counterService", "activityService", function voteServiceFactory($q, $FirebaseObject, $FirebaseArray, fbutil, counters, activities) {
            var UserVoteFactory = $FirebaseObject.$extendFactory({
                   isEmpty: function() {
                       if(!this.voteItems || !angular.isObject(this.voteItems)) {
                           return true;
                       }
                       for(var prop in this.voteItems) {
                           if (this.voteItems.hasOwnProperty(prop)) {
                               return false;
                           }
                       }
                       return true;
                   }
                });

            return {

                sync: {
                    votes: fbutil.syncArray("votes"),
                    vote: function (voteId) {
                        if (!voteId) {
                            throw new Error("voteId argument is not valid");
                        }
                        return fbutil.syncObject("votes/" + voteId);
                    },
                    voteResult: function (voteId) {
                        if (!voteId) {
                            throw new Error("voteId argument is not valid");
                        }
                        return fbutil.syncArray("voteResults/" + voteId);
                    },
                    userVotes: fbutil.syncArray("userVotes"),
                    userVote: function (userId, voteId) {
                        if (!userId) {
                            throw new Error("userId argument is not valid");
                        }
                        if (!voteId) {
                            throw new Error("voteId argument is not valid");
                        }
                        return fbutil.fb("userVotes/" + userId + "/" + voteId, {
                            objectFactory: UserVoteFactory
                        }).$asObject();
                    }
                },

                saveVote: function (id, vote, user, userProfile) {
                    if (!id || !angular.isObject(vote)) {
                        throw new Error("Invalid arguments", arguments);
                    }

                    var fb = fbutil.fb("votes");
                    return fb.$set(id, vote).then(function () {
                        //activities.publish("voteadded", user, userProfile);
                    })
                },

                removeVote: function (id, user, userProfile) {
                    if (!id) {
                        throw new Error("Invalid arguments", arguments)
                    }

                    var fb = fbutil.fb("votes");
                    return fb.$remove(id).then(function () {
                        //activities.publish("voteremoved", user, userProfile);
                    });
                },

                saveUserVote: function (voteId, voteSet, user, userProfile) {
                    if (!voteId || !voteSet || !angular.isArray(voteSet) || !user || !userProfile) {
                        throw new Error("Invalid arguments", arguments);
                    }

                    var refUserVote = fbutil.fb("userVotes/" + user.id),
                        refVoteResult = fbutil.fb("voteResults/" + voteId),
                        syncVoteCounters = counters.voteCounters(voteId),
                        data = createVoteResult(user, userProfile, voteSet);

                    return $q.all([
                        refUserVote.$set(voteId, data),
                        refVoteResult.$set(user.id, data)
                    ]).then(function () {
                        syncVoteCounters.plusSaved();
                        activities.publish("uservotesaved", user, userProfile);
                    });
                },

                removeUserVote: function (voteId, user, userProfile) {
                    if (!voteId || !user || !userProfile) {
                        throw new Error("Invalid arguments", arguments);
                    }

                    var refUserVote = fbutil.fb("userVotes/" + user.id + "/" + voteId),
                        refVoteResult = fbutil.fb("voteResults/" + voteId + "/" + user.id),
                        syncVoteCounters = counters.voteCounters(voteId);
                    return $q.all([
                        refUserVote.$remove(),
                        refVoteResult.$remove()
                    ]).then(function () {
                        syncVoteCounters.plusDeleted();
                        activities.publish("uservotedeleted", user, userProfile);
                    });
                },

                createSelection: function (voteId, limit) {
                    var selection = new Dictionary(limit);
                    selection.voteId = voteId;
                    return selection;
                }
            };

            function createVoteResult(user, userProfile, voteSet) {
                if (!user || !userProfile || !voteSet || !angular.isArray(voteSet)) {
                    throw new Error("Invalid arguments");
                }
                // Order voteSet by descending points value
                voteSet.sort(function (item1, item2) {
                    return item2.points - item1.points;
                });
                var userVote = {
                    userInfo: {
                        displayName: user.displayName || "Anonymous",
                        pageUrl: userProfile.pageUrl || null,
                        pictureUrl: userProfile.pictureUrl || null
                    },
                    date: +moment().utc(),
                    voteItems: []
                };
                voteSet.forEach(function (item, index) {
                    userVote.voteItems[item.id] = item;
                });
                return userVote;
            }
        }])

        .factory("notifier", ["$window", function notifierFactory($window) {
            $window.toastr.options = {
                "closeButton": false,
                "debug": false,
                "positionClass": "toast-bottom-left",
                "onclick": null,
                "showDuration": "300",
                "hideDuration": "1000",
                "timeOut": "5000",
                "extendedTimeOut": "1000",
                "showEasing": "swing",
                "hideEasing": "linear",
                "showMethod": "fadeIn",
                "hideMethod": "fadeOut"
            };

            var notifier = {
                success: function (message, title) {
                    if (!message) {
                        return;
                    }
                    $window.toastr.success(message, title);
                },
                info: function (message, title) {
                    if (!message) {
                        return;
                    }
                    $window.toastr.info(message, title);
                },
                warning: function (message, title) {
                    if (!message) {
                        return;
                    }
                    $window.toastr.warning(message, title);
                },
                error: function (message, title) {
                    if (!message) {
                        return;
                    }
                    $window.toastr.error(message, title);
                }

            }
            return notifier;
        }])
    ;

    function FavoriteDictionary(maxItems) {
        var idMap = { };
        var list = new Array();
        list.maxItems = 100;
        if (angular.isNumber(maxItems) && maxItems > 0) {
            list.maxItems = maxItems;
        }
        list.isFull = function () {
            return list.length >= list.maxItems;
        };

        list.$add = function (item) {
            if (!item || (!item.id) || (item.id in idMap)) {
                return;
            }
            idMap[item.id] = item;
            list.push(item);
            item.isFavorite = true;
        };
        list.$remove = function (item) {
            if (!item || (!item.id) || !(item.id in idMap)) {
                return;
            }
            delete idMap[item.id];
            var i;
            while ((i = list.indexOf(item)) !== -1) {
                list.splice(i, 1);
            }
            item.isFavorite = false;
        };
        list.$contains = function (item) {
            //return list.indexOf(item) !== -1;
            return idMap[item.id] ? true : false;
        };
        // Adds or remove an item accordingly
        list.$toggle = function (item) {
            if (!item) {
                return;
            }
            if (list.$contains(item)) {
                list.$remove(item);
            } else {
                list.$add(item);
            }
            ;
        };
        list.$clear = function () {
            list.forEach(function (item, index) {
                item.isFavorite = false;
            });
            list.splice(0, list.length);
        };
        return list;
    }

    function Dictionary(limit) {
        var idMap = { };
        var list = new Array();

        list.add = function (item) {
            if (!item || (!item.id) || (item.id in idMap)) {
                return false;
            }
            idMap[item.id] = item;
            list.push(item);

            return true;
        };

        list.remove = function (item) {
            if (!item || (!item.id) || !(item.id in idMap)) {
                return false;
            }
            delete idMap[item.id];
            var i;
            while ((i = list.indexOf(item)) !== -1) {
                list.splice(i, 1);
            }

            return true;
        };
        list.contains = function (item) {
            return idMap[item.id] ? true : false;
        };

        // Adds or remove an item accordingly
        list.addOrRemove = function (item) {
            if (!item) {
                return false;
            }
            if (list.contains(item)) {
                list.remove(item);
            } else {
                list.add(item);
            }

            return true
        };

        list.clear = function () {
            list.splice(0, list.length);
            idMap = {};
        };

        list.changeLimit = function (limit) {
            if (angular.isNumber(limit) && limit > 0) {
                list.limit = limit;
            }
        };
        list.isFull = function () {
            return list.length >= list.limit;
        };

        list.changeLimit(100);

        return list;
    }

}(angular = window.angular || {});