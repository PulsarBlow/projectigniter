(function(angular) {
    'use strict';
    angular.module('app', [
        'ngAnimate',
        'app.config',
        'app.routes',
        'app.controllers',
        'app.directives',
        'app.decorators',
        'app.filters',
        'app.services',
        'ui.sortable',
        'ui.bootstrap',
        'timer'
    ])
;

})(window.angular || {});
