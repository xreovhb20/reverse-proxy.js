YUI.add("yuidoc-meta", function(Y) {
   Y.YUIDoc = { meta: {
    "classes": [
        "Server",
        "cli.Application",
        "cli.Makefile"
    ],
    "modules": [
        "bin_cli",
        "bin_make",
        "server"
    ],
    "allModules": [
        {
            "displayName": "bin/cli",
            "name": "bin_cli",
            "description": "Command line interface."
        },
        {
            "displayName": "bin/make",
            "name": "bin_make",
            "description": "Build system."
        },
        {
            "displayName": "server",
            "name": "server",
            "description": "Provides an implementation of a reverse proxy server."
        }
    ]
} };
});