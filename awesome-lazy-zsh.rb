class AwesomeLazyZsh < Formula
  desc "Comprehensive Zsh environment manager with plugins, themes, and profiles"
  homepage "https://github.com/AmJaradat01/awesome-lazy-zsh"
  url "https://github.com/AmJaradat01/awesome-lazy-zsh/archive/v3.0.1.tar.gz"
  sha256 "91b29c7a9ab3d44c038ebd2f1a6a3fb985e84159b6d9c197ee877f79f74eeaa2"
  license "MIT"

  depends_on "node"
  depends_on "git"

  def install
    # Install supporting files
    libexec.install Dir["*"]
    
    # Create wrapper script that runs from the installed location
    (bin/"awesome-lazy-zsh").write <<~EOS
      #!/bin/bash
      cd "#{libexec}" && exec ./setup.sh "$@"
    EOS
  end

  test do
    # Test that the script exists and is executable
    assert_predicate bin/"awesome-lazy-zsh", :exist?
    assert_predicate bin/"awesome-lazy-zsh", :executable?
  end
end