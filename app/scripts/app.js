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

        // Disable debug traces
        .config(['$compileProvider', function ($compileProvider) {
            $compileProvider.debugInfoEnabled(true);
        }])

        // Config tooltips
        .config(['$tooltipProvider', function($tooltipProvider){
            $tooltipProvider.options({appendToBody: true, popupDelay: 250});
        }])

        .run(['$log', '$rootScope', '$window', 'activityService', function($log, $rootScope, $window, activityService) {
            $log.debug('Running app'); //debug
            $window.moment.locale('fr');
            $rootScope.$on('activity:trigger', function(event, args) {
                $log.debug('activity event received : %s', args.name);
                if(activityService.exist(args.name)) {
                    //activityService.publish(arg.name, user, userProfile);
                }
            });

            // DEBUG
            function cleanUp() {
                $log.debug('Cleaning up');
                var ref = new Firebase('https://burning-inferno-9731.firebaseio.com/');
                ref.child('activities').set(null);
                $log.debug('Cleaning up - activities... done');
                ref.child('users').set(null);
                $log.debug('Cleaning up - users... done');
                ref.child('userConfigs').set(null);
                $log.debug('Cleaning up - userConfigs... done');
                ref.child('userProfiles').set(null);
                $log.debug('Cleaning up - userProfiles... done');
                ref.child('userVotes').set(null);
                $log.debug('Cleaning up - userVotes... done');
                ref.child('votes').set(null);
                $log.debug('Cleaning up - votes... done');
                ref.child('voteResults').set(null);
                $log.debug('Cleaning up - voteResults... done');
                ref.child('counters').set(null);
                $log.debug('Cleaning up - counters... done');
                createVotes();
            }

            function createVotes() {
                $log.debug('Creating votes');
                var votes = [
                    {
                        id: '001-project-name',
                        isLocked: false,
                        dateStart: null,
                        dateEnd: moment().utc().add(1, 'month').toISOString(),
                        title: 'Nom du projet',
                        description: 'Parcourez la sélection des noms retenus pour le projet et votez pour vos favoris.',
                        icon: 'copyright',
                        type: 'listpick',
                        options:{
                            minItems: 5,
                            maxItems: 5
                        },
                        items : {
                            'all-around-cook' : {
                                'availability' : {
                                    'dns' : true,
                                    'twitter' : true
                                },
                                'id' : 'all-around-cook',
                                'value' : 'AllAroundCook'
                            },
                            'allegro-cook' : {
                                'availability' : {
                                    'dns' : true,
                                    'twitter' : true
                                },
                                'id' : 'allegro-cook',
                                'value' : 'AllegroCook'
                            },
                            'cook-aces' : {
                                'availability' : {
                                    'dns' : true,
                                    'twitter' : true
                                },
                                'id' : 'cook-aces',
                                'value' : 'CookAces'
                            },
                            'cook-avenue' : {
                                'availability' : {
                                    'dns' : true,
                                    'twitter' : true
                                },
                                'id' : 'cook-avenue',
                                'value' : 'CookAvenue'
                            },
                            'cook-awesome' : {
                                'availability' : {
                                    'dns' : true,
                                    'twitter' : true
                                },
                                'id' : 'cook-awesome',
                                'value' : 'CookAwesome'
                            },
                            'cook-boulevard' : {
                                'availability' : {
                                    'dns' : true,
                                    'twitter' : true
                                },
                                'id' : 'cook-boulevard',
                                'value' : 'CookBoulevard'
                            },
                            'cook-catapult' : {
                                'availability' : {
                                    'dns' : true,
                                    'twitter' : true
                                },
                                'id' : 'cook-catapult',
                                'value' : 'CookCatapult'
                            },
                            'cook-divine' : {
                                'availability' : {
                                    'dns' : true,
                                    'twitter' : true
                                },
                                'id' : 'cook-divine',
                                'value' : 'CookDivine'
                            },
                            'cook-envy' : {
                                'availability' : {
                                    'dns' : true,
                                    'twitter' : true
                                },
                                'id' : 'cook-envy',
                                'value' : 'CookEnvy'
                            },
                            'cook-epic' : {
                                'availability' : {
                                    'dns' : true,
                                    'twitter' : true
                                },
                                'id' : 'cook-epic',
                                'value' : 'CookEpic'
                            },
                            'cook-everest' : {
                                'availability' : {
                                    'dns' : true,
                                    'twitter' : true
                                },
                                'id' : 'cook-everest',
                                'value' : 'CookEverest'
                            },
                            'cook-fiesta' : {
                                'availability' : {
                                    'dns' : true,
                                    'twitter' : true
                                },
                                'id' : 'cook-fiesta',
                                'value' : 'CookFiesta'
                            },
                            'cook-for-sale' : {
                                'availability' : {
                                    'dns' : true,
                                    'twitter' : true
                                },
                                'id' : 'cook-for-sale',
                                'value' : 'CookForSale'
                            },
                            'cook-galaxy' : {
                                'availability' : {
                                    'dns' : true,
                                    'twitter' : true
                                },
                                'id' : 'cook-galaxy',
                                'value' : 'CookGalaxy'
                            },
                            'cook-gems' : {
                                'availability' : {
                                    'dns' : true,
                                    'twitter' : true
                                },
                                'id' : 'cook-gems',
                                'value' : 'CookGems'
                            },
                            'cook-harbor' : {
                                'availability' : {
                                    'dns' : true,
                                    'twitter' : true
                                },
                                'id' : 'cook-harbor',
                                'value' : 'CookHarbor'
                            },
                            'cook-harmony' : {
                                'availability' : {
                                    'dns' : true,
                                    'twitter' : true
                                },
                                'id' : 'cook-harmony',
                                'value' : 'CookHarmony'
                            },
                            'cook-herald' : {
                                'availability' : {
                                    'dns' : true,
                                    'twitter' : true
                                },
                                'id' : 'cook-herald',
                                'value' : 'CookHerald'
                            },
                            'cook-heroes' : {
                                'availability' : {
                                    'dns' : true,
                                    'twitter' : true
                                },
                                'id' : 'cook-heroes',
                                'value' : 'CookHeroes'
                            },
                            'cook-hunt' : {
                                'availability' : {
                                    'dns' : true,
                                    'twitter' : true
                                },
                                'id' : 'cook-hunt',
                                'value' : 'CookHunt'
                            },
                            'cook-hunters' : {
                                'availability' : {
                                    'dns' : true,
                                    'twitter' : true
                                },
                                'id' : 'cook-hunters',
                                'value' : 'CookHunters'
                            },
                            'cook-hyper' : {
                                'availability' : {
                                    'dns' : true,
                                    'twitter' : true
                                },
                                'id' : 'cook-hyper',
                                'value' : 'CookHyper'
                            },
                            'cook-igniter' : {
                                'availability' : {
                                    'dns' : true,
                                    'twitter' : true
                                },
                                'id' : 'cook-igniter',
                                'value' : 'CookIgniter'
                            },
                            'cook-league' : {
                                'availability' : {
                                    'dns' : true,
                                    'twitter' : true
                                },
                                'id' : 'cook-league',
                                'value' : 'CookLeague'
                            },
                            'cook-next' : {
                                'availability' : {
                                    'dns' : true,
                                    'twitter' : true
                                },
                                'id' : 'cook-next',
                                'value' : 'CookNext'
                            },
                            'cook-nexus' : {
                                'availability' : {
                                    'dns' : true,
                                    'twitter' : true
                                },
                                'id' : 'cook-nexus',
                                'value' : 'CookNexus'
                            },
                            'cook-picker' : {
                                'availability' : {
                                    'dns' : true,
                                    'twitter' : true
                                },
                                'id' : 'cook-picker',
                                'value' : 'CookPicker'
                            },
                            'cook-picks' : {
                                'availability' : {
                                    'dns' : true,
                                    'twitter' : true
                                },
                                'id' : 'cook-picks',
                                'value' : 'CookPicks'
                            },
                            'cook-pickup' : {
                                'availability' : {
                                    'dns' : true,
                                    'twitter' : true
                                },
                                'id' : 'cook-pickup',
                                'value' : 'CookPickup'
                            },
                            'cook-premiere' : {
                                'availability' : {
                                    'dns' : true,
                                    'twitter' : true
                                },
                                'id' : 'cook-premiere',
                                'value' : 'CookPremiere'
                            },
                            'cook-pronto' : {
                                'availability' : {
                                    'dns' : true,
                                    'twitter' : true
                                },
                                'id' : 'cook-pronto',
                                'value' : 'CookPronto'
                            },
                            'cook-rally' : {
                                'availability' : {
                                    'dns' : true,
                                    'twitter' : true
                                },
                                'id' : 'cook-rally',
                                'value' : 'CookRally'
                            },
                            'cook-rater' : {
                                'availability' : {
                                    'dns' : true,
                                    'twitter' : true
                                },
                                'id' : 'cook-rater',
                                'value' : 'CookRater'
                            },
                            'cook-scanner' : {
                                'availability' : {
                                    'dns' : true,
                                    'twitter' : true
                                },
                                'id' : 'cook-scanner',
                                'value' : 'CookScanner'
                            },
                            'cook-sherpa' : {
                                'availability' : {
                                    'dns' : true,
                                    'twitter' : true
                                },
                                'id' : 'cook-sherpa',
                                'value' : 'CookSherpa'
                            },
                            'cook-shout' : {
                                'availability' : {
                                    'dns' : true,
                                    'twitter' : true
                                },
                                'id' : 'cook-shout',
                                'value' : 'CookShout'
                            },
                            'cook-spotter' : {
                                'availability' : {
                                    'dns' : true,
                                    'twitter' : true
                                },
                                'id' : 'cook-spotter',
                                'value' : 'CookSpotter'
                            },
                            'cook-sultan' : {
                                'availability' : {
                                    'dns' : true,
                                    'twitter' : true
                                },
                                'id' : 'cook-sultan',
                                'value' : 'CookSultan'
                            },
                            'cook-villa' : {
                                'availability' : {
                                    'dns' : true,
                                    'twitter' : true
                                },
                                'id' : 'cook-villa',
                                'value' : 'CookVilla'
                            },
                            'cook-voice' : {
                                'availability' : {
                                    'dns' : true,
                                    'twitter' : true
                                },
                                'id' : 'cook-voice',
                                'value' : 'CookVoice'
                            },
                            'genial-cook' : {
                                'availability' : {
                                    'dns' : true,
                                    'twitter' : true
                                },
                                'id' : 'genial-cook',
                                'value' : 'GenialCook'
                            },
                            'gusto-cook' : {
                                'availability' : {
                                    'dns' : true,
                                    'twitter' : true
                                },
                                'id' : 'gusto-cook',
                                'value' : 'GustoCook'
                            },
                            'maximo-cook' : {
                                'availability' : {
                                    'dns' : true,
                                    'twitter' : true
                                },
                                'id' : 'maximo-cook',
                                'value' : 'MaximoCook'
                            },
                            'next-door-cook' : {
                                'availability' : {
                                    'dns' : true,
                                    'twitter' : true
                                },
                                'id' : 'next-door-cook',
                                'value' : 'NextDoorCook'
                            },
                            'our-town-cook' : {
                                'availability' : {
                                    'dns' : true,
                                    'twitter' : true
                                },
                                'id' : 'our-town-cook',
                                'value' : 'OurTownCook'
                            },
                            'proxy-cook' : {
                                'availability' : {
                                    'dns' : true,
                                    'twitter' : true
                                },
                                'id' : 'proxy-cook',
                                'value' : 'ProxyCook'
                            },
                            'quasi-cook' : {
                                'availability' : {
                                    'dns' : true,
                                    'twitter' : true
                                },
                                'id' : 'quasi-cook',
                                'value' : 'QuasiCook'
                            },
                            'sector-cook' : {
                                'availability' : {
                                    'dns' : true,
                                    'twitter' : true
                                },
                                'id' : 'sector-cook',
                                'value' : 'SectorCook'
                            },
                            'superb-cook' : {
                                'availability' : {
                                    'dns' : true,
                                    'twitter' : true
                                },
                                'id' : 'superb-cook',
                                'value' : 'SuperbCook'
                            },
                            'top-notch-cook' : {
                                'availability' : {
                                    'dns' : true,
                                    'twitter' : true
                                },
                                'id' : 'top-notch-cook',
                                'value' : 'TopNotchCook'
                            },
                            'top-rated-cook' : {
                                'availability' : {
                                    'dns' : true,
                                    'twitter' : true
                                },
                                'id' : 'top-rated-cook',
                                'value' : 'TopRatedCook'
                            },
                            'top-ten-cook' : {
                                'availability' : {
                                    'dns' : true,
                                    'twitter' : true
                                },
                                'id' : 'top-ten-cook',
                                'value' : 'TopTenCook'
                            },
                            'trend-cook' : {
                                'availability' : {
                                    'dns' : true,
                                    'twitter' : true
                                },
                                'id' : 'trend-cook',
                                'value' : 'TrendCook'
                            },
                            'true-life-cook' : {
                                'availability' : {
                                    'dns' : true,
                                    'twitter' : true
                                },
                                'id' : 'true-life-cook',
                                'value' : 'TrueLifeCook'
                            }
                        }
                    },
                    {
                        id: '002-project-logo',
                        isLocked: true,
                        dateStart: null,
                        dateEnd: null,
                        title: 'Logo et identité visuelle',
                        description: 'Le nom c\'est bien, mais le nom avec une identité visuelle qui assure c\'est encore mieux. Aidez nous à choisir celle qui va bien!',
                        icon: 'newspaper-o',
                        type: 'listpick',
                        options:{
                            minItems: 5,
                            maxItems: 5
                        },
                        items: null
                    },
                    {
                        id: '003-project-features',
                        isLocked: true,
                        dateStart: null,
                        dateEnd: null,
                        title: 'Fonctionnalités v1.0',
                        description: 'Nous vous proposons une sélection de fonctionnalités retenues pour la v1. Dites nous ce qui vous donne envie, votre avis d\'utilisateur est précieux.',
                        icon: 'cubes',
                        type: 'listpick',
                        options:{
                            minItems: 5,
                            maxItems: 5
                        },
                        items: null
                    },
                    {
                        id: '004-project-webdesign',
                        isLocked: true,
                        dateStart: null,
                        dateEnd: null,
                        title: 'Design v1.0',
                        description: 'Pour habiller les fonctionnalités que vous avez choisis, il nous faut un packaging à la hauteur de vos exigences. Un bon site ça se dévore aussi avec les yeux.',
                        icon: 'paint-brush',
                        type: 'listpick',
                        options:{
                            minItems: 5,
                            maxItems: 5
                        },
                        items: null
                    }];

                var ref = new Firebase('https://burning-inferno-9731.firebaseio.com/votes');
                ref.set(null);
                $log.debug('Creating votes - votes deleted');
                votes.forEach(function(item) {
                    //var voteRef = ref.push();
                    //$log.debug('Creating votes - vote '%s' pushed', item.title);
                    ref.child(item.id).set(item);
                    $log.debug('Creating votes - vote "%s" created', item.id);
                });
            }


            $window.cleanUp = cleanUp;
            $window.createVotes = createVotes;
        }]);

})(window.angular || {});
