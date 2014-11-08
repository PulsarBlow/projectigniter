(function (angular) {
    'use strict';

    angular.module('app.directives', ['simpleLogin'])

        .directive('navToggler', ['$rootScope', function ($rootScope) {
            return {
                restrict: 'A',
                link: function (scope, element) {
                    var $app = $('#app');
                    return element.on('click', function (e) {
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
                restrict: 'A',
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

        .directive('scrollTo', ['$timeout', function ($timeout) {

            function scroll (settings) {
                return function () {
                    var scrollPane = angular.element(settings.container);
                    var scrollTo = (typeof settings.scrollTo === 'number') ? settings.scrollTo : angular.element(settings.scrollTo);
                    var scrollY = (typeof scrollTo === 'number') ? scrollTo : scrollTo.offset().top - settings.offset;
                    scrollPane.animate({scrollTop : scrollY }, settings.duration, settings.easing, function(callback){
                        if (typeof callback === 'function') { callback.call(this); }
                    });
                };
            }

            return {
                restrict: 'A',
                link: function (scope, element, attrs) {
                    var settings = angular.extend({
                        container: 'html, body',
                        scrollTo: angular.element(),
                        offset: 0,
                        duration: 150,
                        easing: 'swing'
                    }, attrs);

                    element.on('click', function () {
                        $timeout(scroll(settings));
                    });
                }
            };
        }])

        .directive('toggleOffCanvas', function() {
            return {
                restrict: 'A',
                link: function(scope, element) {
                    element.on('click', function(){
                       $('#app').toggleClass('on-canvas');
                    });
                }
            };
        })
        ;
})(window.angular || {});
