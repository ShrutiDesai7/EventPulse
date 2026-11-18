package com.eventpulse.handler;
import com.amazonaws.services.lambda.runtime.*;
public class HelloHandler implements RequestHandler<Object,String>{public String handleRequest(Object input,Context context){return "EventPulse backend is ready";}}
