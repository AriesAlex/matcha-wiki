<template>
  <figure class="video">
    <div>
      <iframe
        src="https://www.youtube-nocookie.com/embed/zyRH8W58fRI"
        title="Автор Matcha Flavoured о замысле датапака"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen
      />
    </div>
    <figcaption>
      Авторский разбор дизайна Matcha Flavoured. Статья рядом пересказывает
      главные тезисы по оригинальным английским субтитрам.
    </figcaption>
  </figure>
</template>

<style scoped lang="scss">
.video {
  max-width: 820px;
  margin: 30px 0;

  > div {
    aspect-ratio: 16 / 9;
    background: #0a0f0c;

    iframe {
      width: 100%;
      height: 100%;
      display: block;
      border: 0;
    }
  }

  figcaption {
    margin-top: 8px;
    color: var(--muted);
    font-size: 13px;
  }
}
</style>
