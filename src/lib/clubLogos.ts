export function getEntityLogoUrl(entityName?: string, logoUrlFromDb?: string | null): string {
  if (logoUrlFromDb && logoUrlFromDb.trim() !== '') {
    return logoUrlFromDb;
  }

  if (!entityName) return '';

  const nameLower = entityName.toLowerCase().trim();

  if (nameLower.includes('techspark') || nameLower.includes('tech spark')) {
    return '/logos/techspark.png';
  }

  if (nameLower.includes('vaarithi') || nameLower.includes('muthamizh')) {
    return '/logos/vaarithi.png';
  }

  if (nameLower.includes('nss') || nameLower.includes('national service scheme')) {
    return '/logos/nss.png';
  }

  if (nameLower.includes('uba') || nameLower.includes('unnat bharat')) {
    return '/logos/uba.jpg';
  }

  if (nameLower.includes('telugu')) {
    return '/logos/telugu.jpg';
  }

  if (nameLower.includes('artist')) {
    return '/logos/artist_league.png';
  }

  if (nameLower.includes('infinitus')) {
    return '/logos/infinitus.png';
  }

  if (nameLower.includes('women empowerment') || nameLower.includes('wec')) {
    return '/logos/wec.jpg';
  }

  if (nameLower.includes('fusion')) {
    return '/logos/fusion.png';
  }

  if (nameLower.includes('yuva')) {
    return '/logos/yuva.png';
  }

  if (nameLower.includes('rotaract') || nameLower.includes('rac')) {
    return '/logos/rotaract.png';
  }

  if (nameLower.includes('podx') || nameLower.includes('pod x') || nameLower.includes('pod-x')) {
    return '/logos/podx.png';
  }

  if (nameLower.includes('strem') || nameLower.includes('stream')) {
    return '/logos/strem.jpg';
  }

  if (nameLower.includes('nippon')) {
    return '/logos/nippon.png';
  }

  if (nameLower.includes('helios')) {
    return '/logos/helios.png';
  }

  return '';
}
