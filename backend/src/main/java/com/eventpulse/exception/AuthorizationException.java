package com.eventpulse.exception;
public class AuthorizationException extends RuntimeException { private final int status; public AuthorizationException(int status,String message){super(message);this.status=status;} public int status(){return status;} }
