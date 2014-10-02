/* global S */
!function (angular) {
    "use strict";

    angular.module("app.services", [])

        .factory("names", ["fbutil", function namesFactory(fbutil) {
            return fbutil.syncArray("names");
        }])

        .factory("users", ["fbutil", function usersFactory(fbutil) {
            return fbutil.syncArray("users");
        }])

        .factory("votes", ["fbutil", function votesFactory(fbutil) {
            var votes = fbutil.syncArray("votes");
            votes.saveVote = function(userId, voteSet) {
                if(!userId || !voteSet || !angular.isArray(voteSet)) { throw new Error("invalid argument"); }
                var data = createVoteData(voteSet);
                return votes.$inst().$set(userId, data);
            };
            return votes;
        }])

        .factory("user", ["fbutil", "ANONYMOUS_ID", function userFactory(fbutil, ANONYMOUS_ID) {
            var userId = ANONYMOUS_ID,
                path = {
                    userIdentity: "users/" + userId + "/identity",
                    userConfig: "users/" + userId + "/config",
                    userVote: "users/" + userId + "/vote"
                },
                user = {
                    id: userId,
                    identity: fbutil.syncObject(path.userIdentity),
                    config: fbutil.syncObject(path.userConfig),
                    vote: fbutil.syncArray(path.userVote)
                };

            // voteSet: [{ "id": "all-around-cook", "points": 32 }, { "id": "cook-aces", "points": 16 }]
            user.saveVote = function (voteSet) {

                if (!voteSet || !angular.isArray(voteSet)) { throw new Error("invalid voteSet"); }
                var data = createVoteData(voteSet);
                return user.vote.$inst().$set(data);
            };

            user.hasVote = function () {
                return user.vote.length > 0;
            };

            return user;
        }])

        .factory("user2", ["$FirebaseObject", "$firebase", "fbutil", "FBURL", function user2Factory($FirebaseObject, $firebase, fbutil, FBURL) {

            // Create user if it doesn't exist
            function tryCreateUser (userId, userData) {
                if(!userId) { throw new Error("userId is not valid");}
                if(!userData) { throw new Error("userData is not valid");}

                var $fb = fbutil.fb("users/" + userId);

                return $fb.$transaction(function(currentData){
                    if(currentData === null) {
                        return userData;
                    }
                });
            }

            function parseUser (data) {
                if(!angular.isObject(data) || !data) { return null; }
                return {
                    id: data.uid || "local:anonymous",
                    provider: data.provider || "local",
                    providerId: data.id || "local:anonymous",
                    accessToken: data.accessToken || null,
                    displayName: data.displayName || "Anonymous"
                }
            }

            var UserFactory = $FirebaseObject.$extendFactory({
                tryCreateUser: tryCreateUser
            });

            return function(userId) {
                var ref = new Firebase(FBURL).child("users").child(userId);
                var sync = $firebase(ref, {objectFactory: UserFactory });
                return sync.$asObject();
            }
        }])

        .factory("userProfile", ["$FirebaseObject", "$firebase", "fbutil", "FBURL", function userProfileFactory($FirebaseObject, $firebase, fbutil, FBURL) {

            var UserProfileFactory = $FirebaseObject.$extendFactory({
                // Create user profile if it doesn't exist
                tryCreateUserProfile: function(userId, userProfileData) {
                    if(!userId) { throw new Error("userId is not valid");}
                    if(!userProfileData) { throw new Error("userData is not valid");}

                    var $fb = fbutil.fb("userProfiles/" + userId);

                    return $fb.$transaction(function(currentData){
                        if(currentData === null) {
                            return userProfileData;
                        }
                    });
                },
                parseUserProfile: function(data) {

                    if(!angular.isObject(data) ||
                        !data ||
                        !angular.isObject(data.thirdPartyUserData) ||
                        !data.thirdPartyUserData) {
                        return null;
                    }
                    return parseProviderData(data.provider, data.thirdPartyUserData);

                    function parseProviderData(provider, providerUserData) {
                        if(!angular.isString(provider) || !provider) { throw new Error("Invalid provider"); }
                        if(!angular.isObject(providerUserData)) { throw new Error("Invalid providerUserData"); }

                        switch (angular.lowercase(provider)) {
                            case "facebook":
                                return parseFacebookData(providerUserData);
                            case "google":
                                return parseGoogleData(providerUserData);
                            default:
                                throw new Error("Unable to parse user. Provider ["+ provider + "] is not supported");
                        }
                    }
                    function parseFacebookData(data) {
                        if(!data) { return {}; }
                        return {
                            email: data.email || null,
                            email_verified: false,
                            realName: data.name || null,
                            gender: data.gender || null,
                            page_url: data.link || null,
                            picture_url: parsePictureUrl(data.picture),
                            locale: data.locale || "fr_FR"
                        };

                        function parsePictureUrl(pictureObj) {
                            if(!angular.isObject(pictureObj) || !pictureObj || !pictureObj.data) { return null; }
                            return pictureObj.data.url;
                        }
                    }
                    function parseGoogleData(data) {
                        if(!data) { return {}; }
                        return {
                            email: data.email || null,
                            email_verified: data.verified_email || false,
                            realName: data.name || null,
                            gender: data.gender || null,
                            page_url: data.link || null,
                            picture_url: data.picture || null,
                            locale: data.locale || "fr_FR"
                        };
                    }
                }
            });

            return function(userId) {
                var ref = new Firebase(FBURL).child("userProfiles").child(userId);
                var sync = $firebase(ref, {objectFactory: UserProfileFactory });
                return sync.$asObject();
            };
        }])

        .factory(
        "userData", ["$FirebaseObject", "$firebase", "fbutil", "FBURL", "ANONYMOUS_ID", "LOCAL_PROVIDER",
        function userDataFactory($FirebaseObject, $firebase, fbutil, FBURL, ANONYMOUS_ID, LOCAL_PROVIDER) {

            function guardUserLoginInfo(userLoginInfo) {
                if(!angular.isObject(userLoginInfo)) {
                    throw new Error("userLoginInfo is not an object");
                }

                if(!userLoginInfo.uid) {
                    throw new Error("userLoginInfo.uid is not valid");
                }
            }

            function parseUser (data) {
                if(!angular.isObject(data) || !data) { return null; }
                return {
                    id: data.uid || ANONYMOUS_ID,
                    provider: data.provider || LOCAL_PROVIDER,
                    providerId: data.id || ANONYMOUS_ID,
                    accessToken: data.accessToken || null,
                    displayName: data.displayName || "Anonymous"
                }
            }

            function parseUserProfile(data) {

                if(!angular.isObject(data) ||
                    !angular.isObject(data.thirdPartyUserData)) {
                    return null;
                }
                return parseProviderData(data.provider, data.thirdPartyUserData);
            }

            function parseProviderData(provider, providerUserData) {
                if(!angular.isString(provider) || !provider) { throw new Error("Invalid provider"); }
                if(!angular.isObject(providerUserData)) { throw new Error("Invalid providerUserData"); }

                switch (angular.lowercase(provider)) {
                    case "facebook":
                        return parseFacebookData(providerUserData);
                    case "google":
                        return parseGoogleData(providerUserData);
                    default:
                        throw new Error("Unable to parse user. Provider ["+ provider + "] is not supported");
                }
            }

            function parseFacebookData(data) {
                if(!data) { return {}; }
                return {
                    email: data.email || null,
                    email_verified: false,
                    realName: data.name || null,
                    gender: data.gender || null,
                    page_url: data.link || null,
                    picture_url: parsePictureUrl(data.picture),
                    locale: data.locale || "fr_FR"
                };

                function parsePictureUrl(pictureObj) {
                    if(!angular.isObject(pictureObj) || !pictureObj || !pictureObj.data) { return null; }
                    return pictureObj.data.url;
                }
            }

            function parseGoogleData(data) {
                if(!data) { return {}; }
                return {
                    email: data.email || null,
                    email_verified: data.verified_email || false,
                    realName: data.name || null,
                    gender: data.gender || null,
                    page_url: data.link || null,
                    picture_url: data.picture || null,
                    locale: data.locale || "fr_FR"
                };
            }

            var UserFactory = $FirebaseObject.$extendFactory({

            });
            var UserProfileFactory = $FirebaseObject.$extendFactory({

            });

            return {

                /**
                 * Create user data record if it doesn't exist in firebase
                 * @param userLoginInfo
                 * @returns {Promise} A deferred promise
                 */
                tryCreateUser: function(userLoginInfo) {
                    guardUserLoginInfo(userLoginInfo);

                    var $fb = fbutil.fb("users/" + userLoginInfo.uid);

                    return $fb.$transaction(function(currentData){
                        if(currentData === null) {
                            return parseUser(userLoginInfo);
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

                    return $fb.$transaction(function(currentData){
                        if(currentData === null) {
                            return parseUserProfile(userLoginInfo);
                        }
                    });
                },

                syncUser: function(userId) {
                    var ref = new Firebase(FBURL).child("users").child(userId);
                    var sync = $firebase(ref, {objectFactory: UserFactory });
                    return sync.$asObject();
                },
                syncUserProfile: function(userId) {
                    var ref = new Firebase(FBURL).child("userProfiles").child(userId);
                    var sync = $firebase(ref, {objectFactory: UserFactory });
                    return sync.$asObject();
                }
            };
        }])



        .factory("userFavorites", ["MAX_FAVORITES", function userFavoritesFactory(MAX_FAVORITES) {
            var userFavorites = new FavoriteDictionary(MAX_FAVORITES);
            return userFavorites;
        }])

        .factory("notifier", ["$window", function notifierFactory($window) {
            var notifier = {
                success: function (message) {
                    if (!message) { return; }
                    $window.toastr.success(message);
                },
                info: function(message) {
                    if(!message) { return; }
                    $window.toastr.info(message);
                },
                warning: function(message) {
                    if(!message) { return; }
                    $window.toastr.warning(message);
                },
                error: function(message) {
                    if(!message) { return; }
                    $window.toastr.error(message);
                }

            }
            return notifier;
        }])

        .factory("formatter", function () {
            return {
                formatName: function (value) {
                    if (!value) {
                        return value;
                    }
                    return S(item.value[0].toLowerCase() + item.value.substr(1, item.value.length - 1)).latinise().dasherize().s;
                }
            };
        })
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

    function createVoteData(voteSet) {
        if(!voteSet || !angular.isArray(voteSet)) { throw new Error("voteSet is not valid"); }
        // Order voteSet by descending points value
        voteSet.sort(function (item1, item2) {
            return item2.points - item1.points;
        });
        var data = { };
        voteSet.forEach(function (item, index) {
            // padded key : 001, 002 etc.
            data[S(item.id).padLeft(3, "0").s] = item;
        });
        return data;
    }
}(angular = window.angular || {});