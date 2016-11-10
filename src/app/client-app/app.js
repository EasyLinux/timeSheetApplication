import { modifyBackbone } from './helpers/index';
import { modifyJquery } from './helpers/index';

import { Persons } from './collections/index';

import { Logout } from './models/index';
import { PersonCreation } from './models/index';
import { PersonLogin } from './models/index';
import { Session } from './models/index';

import { login } from './views/index';
import { home } from './views/index';
import { loginCreation } from './views/index';
import { timeSheet } from './views/index';
import { admin } from './views/index';
import { loggedInHeader } from './views/index';
import { loggedOutHeader } from './views/index';

export const app = (function () {

    var api = {
        event_bus: _.extend({}, Backbone.Events),
        content: null,
        router: null,
        init: function() {

            this.content = $('#container');

            window.session = new Session();

            Backbone.history.start();
            return this;
        },
        changeContent: function(el) {
            this.content.empty().append(el);
            return this;
        },
        //Global 'createTemplate' function
        createTemplate: function(templatePath, data) {
            var templateString = window['JST'][templatePath](data);
            return templateString;
        },
        //This is a helper function that will resize a parent div so that
        //a child of the parent can be vertically aligned within
        resizeFunction: function(elementArray) {
            for (var i  = 0; i < elementArray.length; i++) {
                $('#'+elementArray[i]+'>.verticalParentHeight').each( function() {
                        $(".verticalParent", this).css("height", $(this).height());
                });
            }
        }
    };

    //Notes on Factories:
    // - Static views are attached the factory at initialization. Dynamic
    //views are recreated and rereferenced to the factory object.
    var ViewsFactory = {
        createTemplate: function(templatePath, data) {
            var templateString = window['JST'][templatePath](data);
            return templateString;
        },
        showView: function(view) {
            if (this.currentView) {
                this.currentView.close();
            }

            this.currentView = view;
            this.currentView.render();
        },
        login: function() {
            if(!this.loginView) {
                this.loginView = new login({
                    el: $('#container'),
                    template: this.createTemplate('templates/login.tpl'),
                    model: new PersonLogin()
                });
            }
            return this.loginView;
        },
        home: function() {
            if (!this.homeView) {
                this.homeView = new home({
                    el: $('#container'),
                    template: this.createTemplate('templates/home.tpl')
                });
            }
            return this.homeView;
        },
        loginCreation: function() {
            if (!this.loginCreationView) {
                this.loginCreationView = new loginCreation({
                    el: $('#container'),
                    template: this.createTemplate('templates/loginCreation.tpl'),
                    model: new PersonCreation()
                });
            }
            return this.loginCreationView;
        },
        timeSheet: function() {
            this.timeSheetView = new timeSheet({
                el: $('#container'),
                template: this.createTemplate('templates/timeSheet.tpl')
            });
            return this.timeSheetView;
        },
        admin: function() {
            this.AdminView = new admin({
                el: $('#container'),
                template: this.createTemplate('templates/AdminPanel.tpl'),
                collection: new Persons()
            });
            return this.AdminView;
        }
    };

    var HeaderViewFactory = {
        showView: function(view) {
            if (this.currentView) {
                this.currentView.close();
            }

            this.currentView = view;
            this.currentView.render();
        },
        loggedInHeader: function(data) {
            this.loggedInHeaderView = new loggedInHeader({
                el: $('#headerBar-view'),
                model: new Logout(),
                data: data
            });
            return this.loggedInHeaderView;
        },
        loggedOutHeader: function() {
            if(!this.loggedOutHeaderView) {
                this.loggedOutHeaderView = new loggedOutHeader({
                    el: $('#headerBar-view'),
                    template: api.createTemplate('templates/loggedOutHeader.tpl')
                });
            }
            return this.loggedOutHeaderView;
        }
    }

    var Router = Backbone.Router.extend({
        routes: {
            'AdminPanel' : 'admin',
            'timeSheet' : 'timeSheet',
            'CreateAccount' : 'loginCreation',
            'login' : 'login',
            '' : 'home'
        },
        admin: function() {
            app.event_bus.trigger('admin');
        },
        loginCreation : function () {
            app.event_bus.trigger('loginCreation');
        },
        login : function() {
            app.event_bus.trigger('login');
        },
        home : function() {
            app.event_bus.trigger('home');
        },
        timeSheet : function() {
            app.event_bus.trigger('timeSheet');
        }
    });
    api.router = new Router();

    //Route Watcher
    // This is a replacement for the 'execute' function of the router.
    // Was necessary as not all routes will now fire that execute function with
    // the event driven nature of my navigation.
    // NOTE: Using setTimeout in this function because I was getting some strange behavior in Chrome
    // triggering an event within the 'fetch'. setTimeout ensures the call stack has been fully
    // executed until it attempts to pass the message down the event_bus
    var routeWatcher = {
        inspect: function(callback) {
            //Using a cookie to handle whether or not the user has already been authenticated
            var that = this;
            window.session.fetch({
                success: function(model, response) {
                    var route = Backbone.history.getFragment();
                    if (response.isAuthenticated) {
                        var data = { FirstName: response.FirstName, LastName: response.LastName};
                        var view = HeaderViewFactory.loggedInHeader(data);
                        HeaderViewFactory.showView(view);
                        if (response.Role === 'ADMIN') {
                            if (_.contains(that.requiresAuthAdmin, route)) {
                                return callback(true);
                            } else {
                                window.setTimeout(function() {
                                    app.event_bus.trigger('admin');
                                }, 0);
                                return callback(false);
                            }
                        } else {
                            if (_.contains(that.requiresAuth, route)) {
                                return callback(true);
                            } else {
                                window.setTimeout(function() {
                                    app.event_bus.trigger('timeSheet');
                                }, 0);
                                return callback(false);
                            }
                        }
                    } else {
                        var view = HeaderViewFactory.loggedOutHeader();
                        HeaderViewFactory.showView(view);
                        if (_.contains(that.notRequireAuth, route)) {
                            return callback(true);
                        } else {
                            window.setTimeout(function() {
                                app.event_bus.trigger('login');
                            }, 0);
                            return callback(false);
                        }
                    }
                },
                error: function(model, response) {
                    console.log("There was an error with the server.");
                }
            })
        },
        requiresAuthAdmin: ['AdminPanel'],
        requiresAuth: ['timeSheet'],
        notRequireAuth: ['CreateAccount', 'login', '']
    };

    // Tying navigation calls into an event driven architecture
    api.event_bus.bind('home', function() {
        api.router.navigate('');
        routeWatcher.inspect(function(continueRouting) {
            if (continueRouting) {
                var view = ViewsFactory.home();
                ViewsFactory.showView(view);
            }
        });
    });
    api.event_bus.bind('login', function() {
        api.router.navigate('login');
        routeWatcher.inspect(function(continueRouting) {
            if (continueRouting) {
                var view = ViewsFactory.login();
                ViewsFactory.showView(view);
            }
        });
    });
    api.event_bus.bind('loginCreation', function() {
        app.router.navigate('CreateAccount');
        routeWatcher.inspect(function(continueRouting) {
            if (continueRouting) {
                var view = ViewsFactory.loginCreation();
                ViewsFactory.showView(view);
            }
        });
    });
    api.event_bus.bind('admin', function() {
        app.router.navigate('AdminPanel');
        routeWatcher.inspect(function(continueRouting) {
            if (continueRouting) {
                var view = ViewsFactory.admin();
                ViewsFactory.showView(view);
            }
        });
    });
    api.event_bus.bind('timeSheet', function() {
        app.router.navigate('timeSheet');
        routeWatcher.inspect(function(continueRouting) {
            if (continueRouting) {
                var view = ViewsFactory.timeSheet();
                ViewsFactory.showView(view);
            }
        });
    });

    return api;
})();
