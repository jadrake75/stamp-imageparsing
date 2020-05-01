module.exports = api => {
    api.cache.using(() => {
        // cache based on the two env vars
        return 'babel:' + process.env.BABEL_TARGET +
            ' protractor:' + process.env.IN_PROTRACTOR;
    });

    return {
        "plugins": [
            ['@babel/plugin-proposal-decorators', {legacy: true}],
            ['@babel/plugin-proposal-class-properties', {loose: true}]
        ],
        "presets": [
            [
                "@babel/preset-env", {
                "targets": {
                    "browsers": ["last 2 versions"]
                },
                "loose":   true,
                "modules": false
            }
            ]
        ]
    }
}
