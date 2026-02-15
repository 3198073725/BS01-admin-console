const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true,
  chainWebpack: config => {
    config
      .plugin('html')
      .tap(args => {
        args[0].title = 'VidSprout 管理后台'
        return args
      })
  },
  devServer: {
    allowedHosts: 'all',
    host: '0.0.0.0',
    port: 8082,
  },
})
