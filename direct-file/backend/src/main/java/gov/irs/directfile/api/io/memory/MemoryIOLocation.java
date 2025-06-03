package gov.irs.directfile.api.io.memory;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import lombok.extern.slf4j.Slf4j;

import gov.irs.directfile.api.io.IIOLocation;
import gov.irs.directfile.api.io.IOLocationException;

@Slf4j
@SuppressWarnings("PMD.CloseResource")
public class MemoryIOLocation implements IIOLocation {
    // think of this location as a cache.
    // don't use it as a cache, because the stream copy isn't performant.
    // it is still better than getting files off of disk.
    // Locations are meant for heavy IO operations
    Map<String, byte[]> writtenData;

    public MemoryIOLocation() {
        writtenData = new ConcurrentHashMap<>();
    }

    @Override
    public InputStream read(String location) throws IOLocationException {
        byte[] bytes = writtenData.get(location);
        if (bytes != null) {
            log.info("In memory information found at {}!  Copying bytes to a new buffer", location);
            return new ByteArrayInputStream(bytes);
        }
        throw new IOLocationException(
                String.format("Did not write data to in memory location %s before reading", location));
    }

    @Override
    public void write(String location, InputStream payloadStream) throws IOLocationException {
        // we don't know the origin of the stream,
        // so we want to put it into memory, not just assume it was from there.
        byte[] bytes;
        try {
            log.info("Reading data from the input stream to write to in memory stream");
            bytes = payloadStream.readAllBytes();
        } catch (IOException e) {
            throw new IOLocationException("Could not write bytes to in memory stream", e);
        }
        log.info("Adding in memory byte stream at {}", location);
        writtenData.put(location, bytes);
    }

    @Override
    public void delete(String location) throws IOLocationException {
        // my Java isn't great, but I assume that removing this reference
        // will allow the garbage collector to find and destroy this
        writtenData.remove(location);
    }
}
