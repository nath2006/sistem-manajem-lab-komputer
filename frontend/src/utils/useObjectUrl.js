import { useEffect, useState } from 'react';

export function createObjectUrlLease(file) {
  if (!file) return { url: null, release() {} };
  const url = URL.createObjectURL(file);
  let released = false;
  return {
    url,
    release() {
      if (!released) URL.revokeObjectURL(url);
      released = true;
    },
  };
}

export default function useObjectUrl(file) {
  const [resource, setResource] = useState({ file: null, url: null });
  useEffect(() => {
    const lease = createObjectUrlLease(file);
    setResource((previous) =>
      previous.file === file && previous.url === lease.url
        ? previous
        : { file, url: lease.url }
    );
    return lease.release;
  }, [file]);
  return resource.file === file ? resource.url : null;
}
