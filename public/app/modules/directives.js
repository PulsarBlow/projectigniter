!function (angular) {
    "use strict";

    angular.module("app.directives", ["simpleLogin"])

        .directive("navToggler", ["$rootScope", function ($rootScope) {
            return {
                restrict: 'A',
                link: function (scope, ele, attrs) {
                    var $app = $('#app');
                    return ele.on('click', function (e) {
                        var collapsed = true;
                        if ($app.hasClass('nav-collapsed-min')) {
                            $app.removeClass('nav-collapsed-min');
                            collapsed = false;
                        } else {
                            $app.addClass('nav-collapsed-min');
                            collapsed = true;
                        }
                        $rootScope.$broadcast('nav:stateChanged', {
                            collapsed: collapsed
                        });
                        return e.preventDefault();
                    });
                }
            };
        }])

        .directive('reactiveLayout', function () {
            return {
                restrict: "A",
                controller: [
                    '$scope', '$element', '$location', function ($scope, $element, $location) {
                        var addBg, path;
                        path = function () {
                            return $location.path();
                        };
                        addBg = function (path) {
                            $element.removeClass('body-wide body-err body-auth');
                            switch (path) {
                                case '/404':
                                case '/500':
                                    return $element.addClass('body-wide body-err');
                                case '/signin':
                                    return $element.addClass('body-wide body-auth');
                            }
                        };
                        addBg($location.path());
                        return $scope.$watch(path, function (newVal, oldVal) {
                            if (newVal === oldVal) {
                                return;
                            }
                            return addBg($location.path());
                        });
                    }
                ]
            };
        })

        .directive('goBack', [
            function() {
                return {
                    restrict: "A",
                    controller: [
                        '$scope', '$element', '$window', function($scope, $element, $window) {
                            return $element.on('click', function() {
                                return $window.history.back();
                            });
                        }
                    ]
                };
            }
        ])

        /**
         * A directive that shows elements only when user is logged in.
         */
        .directive('ngShowAuth', ['simpleLogin', '$timeout', function (simpleLogin, $timeout) {
            var isLoggedIn;
            simpleLogin.watch(function (user) {
                isLoggedIn = !!user;
            });

            return {
                restrict: 'A',
                link: function (scope, el) {
                    el.addClass('ng-cloak'); // hide until we process it

                    function update() {
                        // sometimes if ngCloak exists on same element, they argue, so make sure that
                        // this one always runs last for reliability
                        $timeout(function () {
                            el.toggleClass('ng-cloak', !isLoggedIn);
                        }, 0);
                    }

                    update();
                    simpleLogin.watch(update, scope);
                }
            };
        }])

        /**
         * A directive that shows elements only when user is logged out.
         */
        .directive('ngHideAuth', ['simpleLogin', '$timeout', function (simpleLogin, $timeout) {
            var isLoggedIn;
            simpleLogin.watch(function (user) {
                isLoggedIn = !!user;
            });

            return {
                restrict: 'A',
                link: function (scope, el) {
                    function update() {
                        el.addClass('ng-cloak'); // hide until we process it

                        // sometimes if ngCloak exists on same element, they argue, so make sure that
                        // this one always runs last for reliability
                        $timeout(function () {
                            el.toggleClass('ng-cloak', isLoggedIn !== false);
                        }, 0);
                    }

                    update();
                    simpleLogin.watch(update, scope);
                }
            };
        }]);

        ;
}(angular = window.angular || {});