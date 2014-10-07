!function (angular) {
    "use strict";

    angular.module("app.directives", ["simpleLogin"])

        .directive("navToggler", ["$rootScope", function ($rootScope) {
            return {
                restrict: 'A',
                link: function (scope, ele, attrs) {
                    console.log('directive navtoggler', scope);
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

        ;
}(angular = window.angular || {});