<footer class="footer">
  <div>
    <strong>GameZone 3D</strong>
    <span>Arcade 3D moderno para browser.</span>
  </div>
  <a href="/games">Explorar jogos</a>
</footer>

<style>
  .footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 28px;
    color: #96a7ba;
    border-top: 1px solid rgba(148, 163, 184, 0.16);
  }

  .footer div {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 12px;
  }

  .footer strong,
  .footer a {
    color: #eef7ff;
  }

  .footer a {
    font-weight: 800;
  }

  @media (max-width: 640px) {
    .footer {
      align-items: flex-start;
      flex-direction: column;
      padding: 24px 14px;
    }
  }
</style>
