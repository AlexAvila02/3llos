module.exports = {
  async redirects() {
    return [
      { source: '/arroz-quemado', destination: '/arroz', permanent: true }
    ];
  }
}
