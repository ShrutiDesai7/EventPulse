package com.eventpulse.util;
import java.time.Instant; import java.time.format.DateTimeParseException;
public final class DateTimeUtil {private DateTimeUtil(){} public static Instant parseInstant(String value){try{return Instant.parse(value);}catch(DateTimeParseException e){throw new IllegalArgumentException("Invalid ISO-8601 instant");}}}
