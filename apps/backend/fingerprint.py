"""
Device Fingerprinting for Token Binding
Generates and validates device fingerprints to prevent session hijacking
"""
import hashlib
from typing import Optional
from fastapi import Request

class DeviceFingerprint:
    """Generate and validate device fingerprints"""
    
    @staticmethod
    def generate(request: Request) -> str:
        """
        Generate device fingerprint from request headers
        
        Args:
            request: FastAPI Request object
            
        Returns:
            Fingerprint hash string
        """
        components = []
        
        # User-Agent (most stable identifier)
        user_agent = request.headers.get("user-agent", "")
        components.append(user_agent)
        
        # Partial IP address (subnet /24 to allow some mobility)
        client_ip = request.client.host if request.client else ""
        if client_ip:
            # Take first 3 octets for IPv4, first 6 groups for IPv6
            if ":" in client_ip:  # IPv6
                parts = client_ip.split(":")
                partial_ip = ":".join(parts[:6])
            else:  # IPv4
                parts = client_ip.split(".")
                partial_ip = ".".join(parts[:3])
            components.append(partial_ip)
        
        # Accept-Language (relatively stable)
        accept_language = request.headers.get("accept-language", "")
        components.append(accept_language)
        
        # Accept-Encoding (stable for same browser)
        accept_encoding = request.headers.get("accept-encoding", "")
        components.append(accept_encoding)
        
        # Combine all components
        fingerprint_string = "|".join(components)
        
        # Generate SHA-256 hash
        fingerprint_hash = hashlib.sha256(fingerprint_string.encode()).hexdigest()
        
        return fingerprint_hash
    
    @staticmethod
    def validate(request: Request, stored_fingerprint: str, strict: bool = False) -> bool:
        """
        Validate current request against stored fingerprint
        
        Args:
            request: Current request
            stored_fingerprint: Previously stored fingerprint
            strict: If True, require exact match. If False, allow some variation
            
        Returns:
            True if fingerprint matches (within tolerance)
        """
        current_fingerprint = DeviceFingerprint.generate(request)
        
        if strict:
            # Exact match required
            return current_fingerprint == stored_fingerprint
        else:
            # Allow some variation (e.g., IP change within subnet)
            # For now, we'll use exact match but this can be relaxed
            return current_fingerprint == stored_fingerprint
    
    @staticmethod
    def get_fingerprint_info(request: Request) -> dict:
        """
        Get detailed fingerprint information for debugging/logging
        
        Args:
            request: FastAPI Request object
            
        Returns:
            Dict with fingerprint components
        """
        client_ip = request.client.host if request.client else "unknown"
        
        return {
            "fingerprint": DeviceFingerprint.generate(request),
            "user_agent": request.headers.get("user-agent", ""),
            "ip": client_ip,
            "accept_language": request.headers.get("accept-language", ""),
            "accept_encoding": request.headers.get("accept-encoding", "")
        }


def get_device_fingerprint(request: Request) -> str:
    """Helper function to get device fingerprint from request"""
    return DeviceFingerprint.generate(request)
