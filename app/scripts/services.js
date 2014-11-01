(function (angular) {
    'use strict';

    angular.module('app.services', [])

        .factory('votes', ['$q', 'fbutil', 'appCounters', 'activityService', function ($q, fbutil, appCounters, activityService) {

            function createVoteData(user, userProfile, voteSet) {
                if (!user || !userProfile || !voteSet || !angular.isArray(voteSet)) {
                    throw new Error('Invalid arguments');
                }
                // Order voteSet by descending points value
                voteSet.sort(function (item1, item2) {
                    return item2.points - item1.points;
                });
                var data = {
                    userInfo: {
                        displayName: user.displayName || 'Anonymous',
                        pageUrl: userProfile.pageUrl || null,
                        pictureUrl: userProfile.pictureUrl || null
                    },
                    date: +moment().utc(),
                    voteItems: []
                };
                voteSet.forEach(function (item) {
                    data.voteItems[item.id] = item;
                });
                return data;
            }

            var syncUserVote = function (userId) {
                return fbutil.syncObject('userVotes/' + userId);
            };

            return {
                syncVotes: function () {
                    return fbutil.syncArray('userVotes');
                },
                syncUserVote: syncUserVote,
                saveVote: function (user, userProfile, voteSet) {
                    if (!user || !userProfile || !voteSet || !angular.isArray(voteSet)) {
                        throw new Error('Invalid argument');
                    }

                    var fb = fbutil.fb('userVotes'),
                        data = createVoteData(user, userProfile, voteSet);
                    return fb.$set(user.id, data).then(function () {
                        appCounters.addVotesSaved();
                        activityService.publish('userVoteSaved', user, userProfile);
                    });
                },
                deleteVote: function (user, userProfile) {
                    if (!user || !userProfile) {
                        throw new Error('Invalid arguments');
                    }

                    var fb = fbutil.fb('userVotes');
                    return fb.$remove(user.id).then(function () {
                        appCounters.addVotesDeleted();
                        activityService.publish('userVoteDeleted', user, userProfile);
                    });
                }
            };
        }])

        .factory('userService', ['$log', '$FirebaseObject', '$firebase', 'fbutil', 'activityService', 'FBURL', 'ANONYMOUS_ID', 'LOCAL_PROVIDER', function ($log, $FirebaseObject, $firebase, fbutil, activityService, FBURL, ANONYMOUS_ID, LOCAL_PROVIDER) {

            function guardUserLoginInfo(userLoginInfo) {
                if (!angular.isObject(userLoginInfo)) {
                    throw new Error('userLoginInfo is not an object');
                }

                if (!userLoginInfo.uid) {
                    throw new Error('userLoginInfo.uid is not valid');
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
                    displayName: data.displayName || 'Anonymous'
                };
            }

            function parseUserProfile(data) {

                if (!angular.isObject(data) || !angular.isObject(data.thirdPartyUserData)) {
                    return null;
                }

                return parseProviderData(data.provider, data.thirdPartyUserData);
            }

            function parseProviderData(provider, providerUserData) {
                if (!angular.isString(provider) || !provider) {
                    throw new Error('Invalid provider');
                }
                if (!angular.isObject(providerUserData)) {
                    throw new Error('Invalid providerUserData');
                }

                switch (angular.lowercase(provider)) {
                    case 'facebook':
                        return parseFacebookData(providerUserData);
                    case 'google':
                        return parseGoogleData(providerUserData);
                    default:
                        throw new Error('Unable to parse user. Provider [' + provider + '] is not supported');
                }
            }

            function parseFacebookData(data) {

                function parsePictureUrl(pictureObj) {
                    if (!angular.isObject(pictureObj) || !pictureObj || !pictureObj.data) {
                        return null;
                    }
                    return pictureObj.data.url;
                }

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
                    locale: data.locale || 'fr_FR'
                };
            }

            function parseGoogleData(data) {
                /*jshint camelcase: false */
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
                    locale: data.locale || 'fr_FR'
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

                    var $fb = fbutil.fb('users/' + userLoginInfo.uid),
                    // These 2 are caches to not parse during transaction completion
                        user = parseUser(userLoginInfo),
                        userProfile = parseUserProfile(userLoginInfo);

                    return $fb.$transaction(function (currentData) {
                        var user = parseUser(userLoginInfo);
                        if (currentData === null) {
                            return user;
                        }

                    }).then(function (result) {
                        if (angular.isObject(result)) {
                            activityService.publish('usersignedup', user, userProfile);
                        } else {
                            // update user data
                            var sync = $fb.$asObject();
                            sync.$loaded(function () {
                                sync.accessToken = user.accessToken;
                                sync.displayName = user.displayName;
                                sync.$save();
                            });
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

                    var $fb = fbutil.fb('userProfiles/' + userLoginInfo.uid),
                        userProfile = parseUserProfile(userLoginInfo);

                    return $fb.$transaction(function (currentData) {
                        if (currentData === null) {
                            return parseUserProfile(userLoginInfo);
                        }
                    }).then(function (result) {
                        if (angular.isObject(result)) {
                            // newly created profile, do nothing
                        } else {
                            // update userProfile data
                            var sync = $fb.$asObject();
                            sync.$loaded(function () {
                                sync.email = userProfile.email;
                                sync.emailVerified = userProfile.emailVerified;
                                sync.locale = userProfile.locale;
                                sync.pageUrl = userProfile.pageUrl;
                                sync.pictureUrl = userProfile.pictureUrl;
                                sync.realName = userProfile.realName;
                                sync.$save();
                            });
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

                    var $fb = fbutil.fb('userConfigs/' + userLoginInfo.uid);

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
                    var ref = new Firebase(FBURL).child('users').child(userId);
                    var sync = $firebase(ref);
                    return sync.$asObject();
                },

                /**
                 * Create a synchronized userProfile
                 * @param userId
                 * @returns {*}
                 */
                syncUserProfile: function (userId) {
                    var ref = new Firebase(FBURL).child('userProfiles').child(userId);
                    var sync = $firebase(ref);
                    return sync.$asObject();
                },

                /**
                 * Create a synchronized user config
                 * @param userId
                 * @returns {*}
                 */
                syncUserConfig: function (userId) {
                    var ref = new Firebase(FBURL).child('userConfigs').child(userId);
                    var sync = $firebase(ref);
                    return sync.$asObject();
                },

                /**
                 * Create a synchronized array containing vote for a given user
                 * @param userId
                 * @returns {*}
                 */
                syncUserVote: function (userId) {
                    var ref = new Firebase(FBURL).child('userVotes').child(userId);
                    var sync = $firebase(ref);
                    return sync.$asArray();
                }
            };
        }])

        .factory('counterService', ['$FirebaseObject', 'fbutil', function ($FirebaseObject, fbutil) {

            var VoteCountersFactory = $FirebaseObject.$extendFactory({
                plusSaved: function () {
                    this.deleted = this.deleted || 0; // Initialize if needed
                    this.saved = this.saved || 0;
                    this.saved++;
                    this.$save();
                },
                plusDeleted: function () {
                    this.saved = this.saved || 0; // Initialize if needed
                    this.deleted = this.deleted || 0;
                    this.deleted++;
                    this.$save();
                }
            });


            return {
                voteCounters: function (voteId) {
                    if (!voteId) {
                        throw new Error('voteId argument is not valid');
                    }
                    return fbutil.fb('counters/votes/' + voteId, {
                        objectFactory: VoteCountersFactory
                    }).$asObject();
                }
            };
        }])

        .factory('activityService', ['$q', '$log', '$rootScope', 'fbutil', 'ACTIVITY_LIMIT', function ($q, $log, $rootScope, fbutil, ACTIVITY_LIMIT) {

            var messages = {
                usersignedup: {
                    title: 'Nouvel arrivant!',
                    content: '{{displayName}} vient de rejoindre notre petite communauté. Bienvenue à lui/elle !',
                    type: 'primary',
                    icon: 'child'
                },
                usersignedin: {
                    title: 'Connexion',
                    content: '{{displayName}} s\'est connecté.',
                    type: 'info',
                    icon: 'sign-in'
                },
                usersignedout: {
                    title: 'Déconnexion',
                    content: '{{displayName}} s\'est déconnecté.',
                    type: 'default',
                    icon: 'sign-out'
                },
                uservotesaved: {
                    title: 'A voté',
                    content: '{{displayName}} a voté. Merci à lui.',
                    type: 'success',
                    icon: 'heart'
                },
                uservotedeleted: {
                    title: 'N\'aime plus son vote',
                    content: '{{displayName}} n\'aimait pas son vote et l\'a supprimé.',
                    type: 'danger',
                    icon: 'undo'
                },
                hasKey: function (keyName) {
                    if (!keyName) {
                        return false;
                    }
                    return (keyName.toLowerCase() in messages);
                },
                getMessage: function (messageName) {
                    if (!messageName || !messages.hasKey(messageName)) {
                        throw new Error('unknown message : ' + messageName);
                    }
                    return messages[messageName.toLowerCase()];
                }
            };

            function createActivity(activityName, user, userProfile) {

                function createUserInfo(user, userProfile) {
                    if (!user || !user.id || !user.displayName) {
                        return null;
                    }

                    return {
                        id: user.id,
                        displayName: user.displayName || 'Anonymous',
                        pageUrl: userProfile && userProfile.pageUrl ? userProfile.pageUrl : null,
                        pictureUrl: userProfile && userProfile.pictureUrl ? userProfile.pictureUrl : null
                    };
                }

                var message = messages.getMessage(activityName);
                var templateValues = {
                    displayName: (user && user.displayName) ? user.displayName : 'Anonymous'
                };

                return {
                    date: moment().utc().toISOString(),
                    title: S(message.title).template(templateValues).s,
                    content: S(message.content).template(templateValues).s,
                    type: message.type,
                    icon: message.icon,
                    userInfo: createUserInfo(user, userProfile)
                };
            }

            function saveActivity(activity) {
                var activitiesRef = fbutil.ref('activities'),
                    newActivityRef = activitiesRef.push(),
                    priority = +moment('2030-01-01T00:00:00') - +moment(),
                    dfd = $q.defer();
                newActivityRef.setWithPriority(activity, priority, function (err) {
                    if (err) {
                        dfd.reject(err);
                    } else {
                        dfd.resolve(activity);
                    }
                });
                return dfd.promise;
            }

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
                        dfd.reject('unknown activity ' + activityName);
                        return dfd.promise;
                    }
                    var activity = createActivity(activityName, user, userProfile);
                    $log.debug('publishing activity', activity);
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
                    return fbutil.syncArray('activities', {limit: limit || ACTIVITY_LIMIT });
                },

                like: function (id, user, userProfile) {
                    if (!id) {
                        return;
                    }
                    var activityRef = fbutil.ref('activities').child(id).child('likers').child(user.id);
                    activityRef.set({displayName: user.displayName, pictureUrl: userProfile.pictureUrl });
                }
            };
        }])

        .factory('voteService', ['$log', '$q', '$FirebaseObject', '$FirebaseArray', 'fbutil', 'ANONYMOUS_ID', 'counterService', 'activityService', function ($log, $q, $FirebaseObject, $FirebaseArray, fbutil, ANONYMOUS_ID, counters, activities) {

            function VoteSummary(votes, voters, totalPoints) {
                this.votes = votes || [];
                this.voters = voters || [];
                this.totalPoints = totalPoints || 0;
            }
            function createSummary(voteResult) {

                if (!angular.isObject(voteResult)) {
                    return new VoteSummary();
                }

                var allVotesMap = {},
                    allVotes = [],
                    allVotersMap = {},
                    allVoters = [],
                    totalPoints = 0;

                angular.forEach(voteResult, function (vote) {
                    if (!angular.isObject(vote) || !angular.isObject(vote.voteItems)) {
                        return;
                    }

                    var currentVoter = vote.userInfo;

                    angular.forEach(vote.voteItems, function (voteItem) {

                        allVotesMap[voteItem.id] = allVotesMap[voteItem.id] || {
                            id: voteItem.id,
                            value: voteItem.value,
                            points: 0,
                            num: 0,
                            voters: []
                        };

                        allVotesMap[voteItem.id].points += voteItem.points;
                        allVotesMap[voteItem.id].num += 1;
                        totalPoints += voteItem.points;
                        allVotesMap[voteItem.id].voters.push({
                            displayName: currentVoter.displayName,
                            pageUrl: currentVoter.pageUrl,
                            pictureUrl: currentVoter.pictureUrl,
                            points: voteItem.points
                        });
                    });
                    allVotersMap[currentVoter.id] = allVotersMap[currentVoter.id] || currentVoter;
                });

                $log.debug('voteSummaryService:computeResult:allVotesMap', allVotesMap);

                angular.forEach(allVotesMap, function (vote) {
                    allVotes.push(vote);
                });

                // sort by points descending then by total number of voters
                allVotes.sort(function (item1, item2) {
                    var result = item2.points - item1.points;
                    if (result !== 0) {
                        return result;
                    }
                    return item2.voters.length - item1.voters.length;
                });

                $log.debug('voteSummaryService:computeResult:allVotersMap', allVotersMap);
                angular.forEach(allVotersMap, function (voter) {
                    allVoters.push(voter);
                });

                var summary = new VoteSummary(allVotes, allVoters, totalPoints);
                $log.debug('voteSummaryService:computeResult:summary', summary);
                return summary;
            }
            function createUserVoteResult(user, userProfile, voteItems) {
                if (!user || !userProfile || !voteItems || !angular.isArray(voteItems)) {
                    throw new Error('Invalid arguments');
                }

                // Order voteSet by descending points value
                voteItems.sort(function (item1, item2) {
                    return item2.points - item1.points;
                });

                var userVote = {
                    userInfo: {
                        id: user.id || ANONYMOUS_ID,
                        displayName: user.displayName || 'Anonymous',
                        pageUrl: userProfile.pageUrl || null,
                        pictureUrl: userProfile.pictureUrl || null
                    },
                    date: +moment().utc(),
                    voteItems: []
                };

                voteItems.forEach(function (item) {
                    userVote.voteItems[item.id] = item;
                });

                return userVote;
            }
            function createVoteSuggestion(user, userProfile, items) {
                if (!user || !userProfile || !items || !angular.isArray(items)) {
                    throw new Error('Invalid arguments');
                }

                var suggestionItems = [];
                angular.forEach(items, function(item){
                    if(typeof item.toJSON === 'function') {
                        suggestionItems.push(item.toJSON());
                    } else {
                        suggestionItems.push(angular.copy(item));
                    }
                });

                // Order suggestion by date
                suggestionItems.sort(function(item1, item2){
                   return item2.dateUtc.diff(item1.dateUtc);
                });

                var voteSuggestion = {
                    userInfo: {
                        id: user.id || ANONYMOUS_ID,
                        displayName: user.displayName || 'Anonymous',
                        pageUrl: userProfile.pageUrl || null,
                        pictureUrl: userProfile.pictureUrl || null
                    },
                    date: +moment().utc(),
                    suggestionItems: suggestionItems
                };

                return voteSuggestion;
            }

            var UserVoteFactory = $FirebaseObject.$extendFactory({
                isEmpty: function () {
                    if (!this.voteItems || !angular.isObject(this.voteItems)) {
                        return true;
                    }
                    for (var prop in this.voteItems) {
                        if (this.voteItems.hasOwnProperty(prop)) {
                            return false;
                        }
                    }
                    return true;
                }
            });

            return {

                sync: {
                    votes: fbutil.syncArray('votes'),

                    vote: function (voteId) {
                        if (!voteId) {
                            throw new Error('voteId argument is not valid');
                        }
                        return fbutil.syncObject('votes/' + voteId);
                    },

                    voteResult: function (voteId) {
                        if (!voteId) {
                            throw new Error('voteId argument is not valid');
                        }
                        return fbutil.syncArray('voteResults/' + voteId);
                    },

                    userVotes: fbutil.syncArray('userVotes'),

                    userVote: function (userId, voteId) {
                        if (!userId) {
                            throw new Error('userId argument is not valid');
                        }
                        if (!voteId) {
                            throw new Error('voteId argument is not valid');
                        }
                        return fbutil.fb('userVotes/' + userId + '/' + voteId, {
                            objectFactory: UserVoteFactory
                        }).$asObject();
                    },

                    voteSummary: function(voteId) {
                        if (!voteId) {
                            throw new Error('voteId argument is not valid');
                        }

                        var summary = new VoteSummary(), SyncFactory = $FirebaseObject.$extendFactory({
                                toJSON: function () {
                                    // This will filter out any firebase properties
                                    var json = {};
                                    angular.forEach(this, function (item, key) {
                                        var skey = S(key.toString());
                                        if (skey.startsWith('$') || skey.startsWith('$$')) {
                                            return;
                                        }
                                        json[key] = item;
                                    });
                                    return json;
                                }
                            }),
                            sync = fbutil.syncObject('voteResults/' + voteId, {objectFactory: SyncFactory});
                        sync.$watch(function () {
                            $log.debug('voteSummaryService:syncWatch', {voteId: voteId, args: arguments});
                            var result = createSummary(sync.toJSON());

                            summary.votes.splice(0, summary.votes.length);
                            angular.forEach(result.votes, function(vote){
                                summary.votes.push(vote);
                            });

                            summary.voters.splice(0, summary.voters.length);
                            angular.forEach(result.voters, function(voter){
                                summary.voters.push(voter);
                            });

                            summary.totalPoints = result.totalPoints;
                        });

                        return summary;
                    }
                },

                saveVote: function (id, vote, user, userProfile) {
                    if (!id || !angular.isObject(vote)) {
                        throw new Error('Invalid arguments', arguments);
                    }

                    var fb = fbutil.fb('votes');
                    return fb.$set(id, vote).then(function () {
                        activities.publish('voteadded', user, userProfile);
                    });
                },

                removeVote: function (id, user, userProfile) {
                    if (!id) {
                        throw new Error('Invalid arguments', arguments);
                    }

                    var fb = fbutil.fb('votes');
                    return fb.$remove(id).then(function () {
                        activities.publish('voteremoved', user, userProfile);
                    });
                },

                saveUserVote: function (voteId, itemSet, user, userProfile) {
                    if (!voteId || !itemSet || !angular.isArray(itemSet) || !user || !userProfile) {
                        throw new Error('Invalid arguments', arguments);
                    }

                    var refUserVote = fbutil.fb('userVotes/' + user.id),
                        refVoteResult = fbutil.fb('voteResults/' + voteId),
                        syncVoteCounters = counters.voteCounters(voteId),
                        userVoteResult = createUserVoteResult(user, userProfile, itemSet);

                    return $q.all([
                        refUserVote.$set(voteId, userVoteResult),
                        refVoteResult.$set(user.id, userVoteResult)
                    ]).then(function () {
                        syncVoteCounters.plusSaved();
                        activities.publish('uservotesaved', user, userProfile);
                    });
                },

                removeUserVote: function (voteId, user, userProfile) {
                    if (!voteId || !user || !userProfile) {
                        throw new Error('Invalid arguments', arguments);
                    }

                    var refUserVote = fbutil.fb('userVotes/' + user.id + '/' + voteId),
                        refVoteResult = fbutil.fb('voteResults/' + voteId + '/' + user.id),
                        syncVoteCounters = counters.voteCounters(voteId);
                    return $q.all([
                        refUserVote.$remove(),
                        refVoteResult.$remove()
                    ]).then(function () {
                        syncVoteCounters.plusDeleted();
                        activities.publish('uservotedeleted', user, userProfile);
                    });
                },

                createSelection: function (voteId, limit) {
                    var selection = new Dictionary(limit);
                    selection.voteId = voteId;
                    return selection;
                },

                isVoteOpened: function (vote) {
                    if (!vote || !angular.isObject(vote)) {
                        return false;
                    }

                    var now = moment(),
                        start = vote.dateStart ? moment(vote.dateStart) : moment(0),
                        end = vote.dateEnd ? moment(vote.dateEnd) : moment('2020-01-01');

                    return now.isAfter(start, 'min') && now.isBefore(end, 'min');
                },

                getVoteProgress: function (vote) {
                    if (!angular.isObject(vote) || !vote.dateEnd) {
                        return 0;
                    }
                    var momentStart = vote.dateStart ? moment(vote.dateStart) : moment(),
                        momentEnd = vote.dateEnd ? moment(vote.dateEnd) : moment('2020-01-01'),
                        momentNow = moment(),
                        msInterval = momentEnd.diff(momentStart),
                        result = Math.round((momentEnd.diff(momentNow) * 100) / msInterval);
                    return result > 0 ? result : 0;
                },

                saveVoteSuggestion: function(voteId, itemSet, user, userProfile) {
                    if (!voteId || !itemSet || !angular.isArray(itemSet) || !user || !userProfile) {
                        throw new Error('Invalid arguments', arguments);
                    }

                    var refVoteSuggestions = fbutil.fb('voteSuggestions/' + voteId),
                        refUserVoteSuggestions = fbutil.fb('userVoteSuggestions/' + user.id + '/' + voteId),
                        voteSuggestion = createVoteSuggestion(user, userProfile, itemSet);
                    return $q.all([
                        refVoteSuggestions.$push(voteSuggestion),
                        refUserVoteSuggestions.$push(voteSuggestion)
                    ]).then(function() {
                        activities.publish('votesuggestionsave', user, userProfile);
                    });
                }
            };

        }])

        .factory('notifier', ['$window', function ($window) {
            $window.toastr.options = {
                'closeButton': false,
                'debug': false,
                'positionClass': 'toast-bottom-left',
                'onclick': null,
                'showDuration': '300',
                'hideDuration': '1000',
                'timeOut': '5000',
                'extendedTimeOut': '1000',
                'showEasing': 'swing',
                'hideEasing': 'linear',
                'showMethod': 'fadeIn',
                'hideMethod': 'fadeOut'
            };

            return {
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

            };

        }])

        .factory('nameCheckService', ['$log', '$q', '$http', function($log, $q, $http){

            function NameCheck(data) {
                this.id = data.id;
                this.name = data.name;
                this.query = data.query;
                this.dateUtc = data.dateUtc ? moment(data.dateUtc) : moment();
                this.domains = data.domains || [];
                this.socialNetworks = data.socialNetworks || [];
            }
            NameCheck.prototype = {
                isValid: function() {
                    return this.socialNetworks && this.socialNetworks.twitter === true &&
                            this.domains && this.domains.com && this.domains.com === true;
                },
                getRate: function() {
                    var rate = 0;
                    if(this.socialNetworks.twitter === true){
                        rate += 30;
                    }
                    if(this.domains.com === true) {
                        rate += 40;
                    }
                    if(this.domains.net === true) {
                        rate += 15;
                    }
                    if(this.domains.org === true) {
                        rate += 15;
                    }
                    return Math.round(rate / 20); // 0 to 5;
                },
                toJSON: function() {
                    return {
                        id: this.id,
                        name: this.name,
                        query: this.query,
                        dateUtc: this.dateUtc.toISOString(),
                        domains: this.domains,
                        socialNetworks: this.socialNetworks
                    };
                }
            };

            return {
                check: function(name) {
                    var dfd = $q.defer();
                    if(!name) {
                        dfd.reject();
                    }
                    $http.get('https://namecheck.azurewebsites.net/api/namechecks/' + name, {
                    //$http.get('http://localhost:19928/api/namechecks/' + name, {
                        cache: false,
                        responseType: 'json'
                    })
                        .success(function(data){
                            dfd.resolve(new NameCheck(data));
                        })
                        .error(function(data, status){
                            dfd.reject({data: data, status:status});
                        });
                    return dfd.promise;
                }
            };

        }])
    ;

    function Dictionary(limit) {
        var idMap = { },
            list = [];

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

            return true;
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

        list.changeLimit(limit || 100);

        return list;
    }

})(window.angular || {});
