/*jshint -W030 */
(function(angular) {
    'use strict';

    angular.module('simpleLogin', ['firebase', 'firebase.utils'])

        // a simple wrapper on simpleLogin.getUser() that rejects the promise
        // if the user does not exists (i.e. makes user required)
        .factory('requireUser', ['simpleLogin', '$q', function (simpleLogin, $q) {
            return function () {
                return simpleLogin.getUser().then(function (user) {
                    return user ? user : $q.reject({ authRequired: true });
                });
            };
        }])

        .factory('simpleLogin', ['$firebaseSimpleLogin', 'fbutil', '$q', '$rootScope',
            function ($firebaseSimpleLogin, fbutil, $q, $rootScope) {
                var auth = $firebaseSimpleLogin(fbutil.ref());
                var listeners = [];

                function statusChange() {
                    fns.getUser().then(function (user) {
                        fns.user = user || null;
                        angular.forEach(listeners, function (fn) {
                            fn(user || null);
                        });
                    });
                }

                var fns = {
                    user: null,

                    getUser: function () {
                        return auth.$getCurrentUser();
                    },

                    login: function (provider) {
                        switch (provider) {
                            case 'facebook':
                                return auth.$login('facebook', {
                                    preferRedirect: true,
                                    rememberMe: true,
                                    scope: 'public_profile'
                                });
                            case 'google':
                                return auth.$login('google', {
                                    preferRedirect: true,
                                    rememberMe: true,
                                    scope: 'profile, email'
                                });
                            default:
                                throw new Error('Login provider not supported');
                        }
                    },

                    logout: function () {
                        auth.$logout();
                    },

                    watch: function (cb, $scope) {
                        fns.getUser().then(function (user) {
                            cb(user);
                        });
                        listeners.push(cb);
                        var unbind = function () {
                            var i = listeners.indexOf(cb);
                            if (i > -1) {
                                listeners.splice(i, 1);
                            }
                        };
                        if ($scope) {
                            $scope.$on('$destroy', unbind);
                        }
                        return unbind;
                    }
                };

                $rootScope.$on('$firebaseSimpleLogin:login', statusChange);
                $rootScope.$on('$firebaseSimpleLogin:logout', statusChange);
                $rootScope.$on('$firebaseSimpleLogin:error', statusChange);

                statusChange();

                return fns;
            }]);

})(window.angular || {});