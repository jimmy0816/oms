import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';

export default async function oidcLogoutUrl(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).end(); // Method Not Allowed
  }

  const idToken = req.query.id_token as string; // Get id_token from query parameter

  if (!idToken || !process.env.OIDC_ISSUER) {
    return res.status(400).json({
      error: 'id_token or OIDC_ISSUER not configured.',
    });
  }

  try {
    const wellKnownUrl = `${process.env.OIDC_ISSUER}/.well-known/openid-configuration`;
    const response = await fetch(wellKnownUrl);
    const config = await response.json();
    const endSessionEndpoint = config.end_session_endpoint;

    if (!endSessionEndpoint) {
      return res
        .status(500)
        .json({ error: 'OIDC end_session_endpoint not found.' });
    }

    const postLogoutRedirectUri = `${process.env.PUBLIC_FRONTEND_URL}/login`;

    let logoutUrl = `${endSessionEndpoint}?post_logout_redirect_uri=${encodeURIComponent(
      postLogoutRedirectUri
    )}`;
    if (idToken) {
      logoutUrl += `&id_token_hint=${encodeURIComponent(idToken as string)}`;
    }

    res.status(200).json({ logoutUrl });
  } catch (error) {
    console.error('Error generating OIDC logout URL:', error);
    res.status(500).json({ error: 'Failed to generate OIDC logout URL.' });
  }
}
