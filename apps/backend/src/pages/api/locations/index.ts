import type { NextApiRequest, NextApiResponse } from 'next';
import { locationService } from '@/services/locationService';
import { withPermission, AuthenticatedRequest } from '@/middleware/auth'; // Import withPermission and AuthenticatedRequest
import { Permission, Location } from 'shared-types';

// Define a type for the handler that includes the authenticated user
type AuthenticatedLocationHandler = (
  req: AuthenticatedRequest,
  res: NextApiResponse
) => Promise<void>;

const handler: AuthenticatedLocationHandler = async (req, res) => {
  try {
    switch (req.method) {
      case 'GET':
        if (req.query.active === 'true') {
          // GET /api/locations?active=true - Get only active locations (for filters)
          // No permission required for this public endpoint
          const activeLocations = await locationService.getActiveLocations();
          return res.status(200).json({ success: true, data: activeLocations });
        } else {
          // GET /api/locations - Get all locations (for management page)
          // Permission check is handled by withPermission middleware
          const allLocations = await locationService.getAllLocations();
          return res.status(200).json({ success: true, data: allLocations });
        }

      case 'POST':
        // POST /api/locations - Create a new location
        const newLocation = await locationService.createLocation(req.body);
        return res.status(201).json({ success: true, data: newLocation });

      case 'PUT':
        // PUT /api/locations - Update an existing location
        const { id: putId, ...updateData } = req.body;
        if (!putId) {
          return res
            .status(400)
            .json({
              success: false,
              error: 'Location ID is required for PUT request.',
            });
        }
        const updatedLocation = await locationService.updateLocation(
          putId as string,
          updateData
        );
        return res.status(200).json({ success: true, data: updatedLocation });

      case 'DELETE':
        // DELETE /api/locations - Delete a location
        const { id: deleteId } = req.body;
        if (!deleteId) {
          return res
            .status(400)
            .json({
              success: false,
              error: 'Location ID is required for DELETE request.',
            });
        }
        await locationService.deleteLocation(deleteId as string);
        return res.status(204).end();

      case 'PATCH':
        // PATCH /api/locations - Reorder locations or partial update
        const { updates, id: patchId, ...patchData } = req.body;

        if (updates && Array.isArray(updates)) {
          // Reorder operation
          await locationService.reorderLocations(updates);
          return res
            .status(200)
            .json({
              success: true,
              message: 'Locations reordered successfully.',
            });
        } else if (patchId) {
          // Partial update for a single location
          const partialUpdatedLocation = await locationService.updateLocation(
            patchId as string,
            patchData
          );
          return res
            .status(200)
            .json({ success: true, data: partialUpdatedLocation });
        } else {
          return res
            .status(400)
            .json({
              success: false,
              error:
                'Invalid PATCH request. Expecting "updates" array for reorder or "id" for partial update.',
            });
        }

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']);
        return res
          .status(405)
          .json({ success: false, error: `Method ${req.method} Not Allowed` });
    }
  } catch (error: any) {
    // Handle errors from service or other parts
    if (error.message.includes('空間名稱已存在')) {
      return res.status(409).json({ success: false, error: error.message });
    }
    if (error.message.includes('此空間尚有關聯的通報')) {
      return res.status(409).json({ success: false, error: error.message });
    }
    console.error('API Error:', error);
    return res
      .status(500)
      .json({
        success: false,
        error: error.message || 'Internal Server Error',
      });
  }
};

// Apply middleware based on method
export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET' && req.query.active === 'true') {
    // Public endpoint for active locations
    return handler(req, res);
  } else {
    // All other methods and GET (without active=true) require MANAGE_LOCATIONS permission
    return withPermission(Permission.MANAGE_LOCATIONS)(handler)(
      req as AuthenticatedRequest,
      res
    );
  }
};
