export default defineConfig(() => {
  return {
    base: '/tiem-sua-chua/', // ĐỔI THÀNH TÊN REPOSITORY CỦA BẠN
    plugins: [react(), tailwindcss()],
    resolve: { /* ... */ },
    server: { /* ... */ }
  };
});
